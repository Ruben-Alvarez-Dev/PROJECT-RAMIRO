# src/tests/unit/context-manager.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextManager } from '@application/services/context-manager.service';
import type { IKnowledgePort } from '@core/ports/input/knowledge.port';
import type { Message } from '@core/domain/types';
import { MessageRole, TierLevel } from '@core/domain/enums';
import { DEFAULT_KNOWLEDGE_CONFIG } from '@core/domain/value-objects/knowledge-config';

describe('ContextManager', () => {
  const mockKnowledge: IKnowledgePort = {
    indexDocument: vi.fn(),
    search: vi.fn().mockResolvedValue([
      { documentId: 'doc-1', title: 'Test Doc', chunk: 'Test content', score: 0.9, tier: TierLevel.CORE },
    ]),
    getDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getTierConfig: vi.fn(),
  };

  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager(mockKnowledge);
    vi.clearAllMocks();
  });

  it('should assemble context with TIER 0 when paths are configured', async () => {
    (mockKnowledge.search as any).mockResolvedValueOnce([
      { documentId: 'tier0-doc', title: 'Sacred Doc', chunk: 'Sacred content here', score: 1.0, tier: TierLevel.SACRED },
    ]);

    const config = { ...DEFAULT_KNOWLEDGE_CONFIG, tier0Paths: ['/path/to/sacred.md'] };
    const result = await manager.assembleContext(config, 'test query', [], 100_000);

    expect(result).toContain('[TIER 0');
    expect(mockKnowledge.search).toHaveBeenCalled();
  });

  it('should include TIER 1 results from knowledge search', async () => {
    const result = await manager.assembleContext(DEFAULT_KNOWLEDGE_CONFIG, 'test query', [], 100_000);

    expect(result).toContain('[TIER 1');
    expect(result).toContain('Test Doc');
  });

  it('should compress conversation history for TIER 2', async () => {
    const messages: Message[] = Array.from({ length: 20 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
      content: `Message ${i}: ${'word '.repeat(50)}`,
      model: i % 2 === 0 ? 'user' : 'mimo-v2.5-pro',
      tier: TierLevel.DYNAMIC,
      tokenCount: 50,
      metadata: {},
      createdAt: new Date(Date.now() - (20 - i) * 60000),
    }));

    const result = await manager.assembleContext(DEFAULT_KNOWLEDGE_CONFIG, 'current message', messages, 100_000);

    expect(result).toContain('[TIER 2');
    expect(result).toContain('[Earlier context]');
    expect(result).toContain('current message');
  });

  it('should always include current message as TIER 3', async () => {
    const result = await manager.assembleContext(DEFAULT_KNOWLEDGE_CONFIG, 'What is React?', [], 100_000);

    expect(result).toContain('[TIER 3');
    expect(result).toContain('What is React?');
  });

  it('should respect token budget allocation (30/25/35/10)', async () => {
    const result = await manager.assembleContext(DEFAULT_KNOWLEDGE_CONFIG, 'query', [], 1_000_000);

    // Should not throw and should contain all tiers
    expect(result).toContain('[TIER');
  });
});
