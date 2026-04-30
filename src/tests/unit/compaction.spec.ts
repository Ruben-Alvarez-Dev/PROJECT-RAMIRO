import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompactionService, DEFAULT_COMPACTION_CONFIG } from '@application/services/memory/compaction.service';
import type { ILLMPort } from '@core/ports/output/llm.port';
import type { LLMMessage } from '@core/domain/types';

describe('CompactionService', () => {
  const mockLLM: ILLMPort = {
    chat: async function* () {
      yield { content: 'Summary of previous conversation about SOLID principles and React architecture.' };
    },
    chatMultimodal: async function* () {},
    getAvailableModels: async () => [],
    estimateTokens: (text: string) => Math.ceil(text.length / 3.5),
  };

  let service: CompactionService;

  beforeEach(() => {
    service = new CompactionService(mockLLM, { contextLimit: 1000, snipThresholdRatio: 0.70 });
  });

  it('should not compact when under threshold', async () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];
    const { result } = await service.compact(messages);
    expect(result.didCompact).toBe(false);
    expect(result.didSnip).toBe(false);
  });

  it('should snip old tool results (Layer 1)', async () => {
    const messages: LLMMessage[] = [];
    // Add 10 old messages with long content
    for (let i = 0; i < 10; i++) {
      messages.push({ role: 'assistant', content: 'A'.repeat(3000) });
    }
    // Add 4 recent messages (within preserveLastNTurns=6)
    for (let i = 0; i < 4; i++) {
      messages.push({ role: 'user', content: 'question' });
    }

    const tokensBefore = service.estimateTokens(messages);
    // Force threshold to be exceeded
    const { result, messages: compacted } = await service.compact(messages);

    // Old messages should be snipped
    const oldMessages = compacted.slice(0, compacted.length - 4);
    for (const m of oldMessages) {
      if (m.content.length > 2000) {
        expect(m.content).toContain('chars snipped');
      }
    }
  });

  it('should auto-compact via LLM (Layer 2) when snip is insufficient', async () => {
    // Create messages that will exceed threshold even after snip
    const messages: LLMMessage[] = [];
    for (let i = 0; i < 50; i++) {
      messages.push({ role: 'user', content: 'x'.repeat(200) });
      messages.push({ role: 'assistant', content: 'y'.repeat(200) });
    }

    const { result, messages: compacted } = await service.compact(messages);

    // Should have summary message + ack + recent
    expect(compacted.length).toBeLessThan(messages.length);
    expect(compacted[0]!.content).toContain('Previous conversation summary');
    expect(compacted[1]!.role).toBe('assistant');
  });

  it('should estimate tokens correctly', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'A'.repeat(350) },  // ~100 tokens
      { role: 'assistant', content: 'B'.repeat(700) }, // ~200 tokens
    ];
    expect(service.estimateTokens(messages)).toBeCloseTo(300, -1);
  });

  it('should return correct threshold', () => {
    expect(service.getThreshold()).toBe(700); // 1000 * 0.70
  });
});
