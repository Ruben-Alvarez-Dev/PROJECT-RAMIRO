# src/tests/unit/memory-service.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryService } from '@application/services/memory.service';
import type { IStoragePort } from '@core/ports/output/storage.port';
import type { IVectorPort } from '@core/ports/output/vector.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { Message, Session, MemoryEntry } from '@core/domain/types';
import { MessageRole, SessionState, SessionType, TierLevel } from '@core/domain/enums';
import { DEFAULT_MODEL_CONFIG } from '@core/domain/value-objects/model-config';
import { DEFAULT_KNOWLEDGE_CONFIG } from '@core/domain/value-objects/knowledge-config';

describe('MemoryService', () => {
  const mockStorage: IStoragePort = {
    saveSession: vi.fn(),
    loadSession: vi.fn(),
    listSessions: vi.fn(),
    deleteSession: vi.fn(),
    saveMemory: vi.fn(),
    recallMemory: vi.fn().mockResolvedValue([]),
  };

  const mockVector: IVectorPort = {
    upsert: vi.fn(),
    search: vi.fn(),
    delete: vi.fn(),
    createCollection: vi.fn(),
  };

  const mockEventBus: IEventBus = {
    emit: vi.fn(),
    on: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    off: vi.fn(),
  };

  let service: MemoryService;

  beforeEach(() => {
    service = new MemoryService(mockStorage, mockVector, mockEventBus);
    vi.clearAllMocks();
  });

  it('should save session messages to storage', async () => {
    const messages: Message[] = [
      { id: 'msg-1', role: MessageRole.USER, content: 'Hello', model: 'user', tier: TierLevel.DYNAMIC, tokenCount: 1, metadata: {}, createdAt: new Date() },
      { id: 'msg-2', role: MessageRole.ASSISTANT, content: 'Hi there', model: 'mimo', tier: TierLevel.DYNAMIC, tokenCount: 2, metadata: {}, createdAt: new Date() },
    ];

    await service.saveSessionMemory('session-1', messages);

    expect(mockStorage.saveMemory).toHaveBeenCalledTimes(2);
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'memory.session.saved' }));
  });

  it('should archive session with summary', async () => {
    const session: Session = {
      id: 'session-1',
      state: SessionState.ACTIVE,
      type: SessionType.VOICE,
      sources: [],
      modelConfig: DEFAULT_MODEL_CONFIG,
      knowledgeConfig: DEFAULT_KNOWLEDGE_CONFIG,
      messages: [
        { id: 'msg-1', role: MessageRole.USER, content: 'What is SOLID?', model: 'user', tier: TierLevel.DYNAMIC, tokenCount: 3, metadata: {}, createdAt: new Date() },
        { id: 'msg-2', role: MessageRole.ASSISTANT, content: 'SOLID is 5 principles...', model: 'mimo', tier: TierLevel.DYNAMIC, tokenCount: 5, metadata: {}, createdAt: new Date() },
      ],
      memory: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const summary = await service.archiveSession(session);

    expect(summary).toContain('Session had 2 messages');
    expect(summary).toContain('What is SOLID');
    expect(mockVector.upsert).toHaveBeenCalledWith('long-term-memory', expect.any(Array));
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'memory.session.archived' }));
  });

  it('should auto-cleanup messages when over limit', async () => {
    const messages: Message[] = Array.from({ length: 20 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
      content: `Message ${i}`,
      model: 'user',
      tier: TierLevel.DYNAMIC,
      tokenCount: 2,
      metadata: {},
      createdAt: new Date(),
    }));

    const kept = await service.autoCleanup('session-1', messages, 10);

    expect(kept).toHaveLength(10);
    expect(mockStorage.saveMemory).toHaveBeenCalled();
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'memory.auto.cleanup' }));
  });

  it('should not cleanup when under limit', async () => {
    const messages: Message[] = Array.from({ length: 5 }, (_, i) => ({
      id: `msg-${i}`,
      role: MessageRole.USER,
      content: `Message ${i}`,
      model: 'user',
      tier: TierLevel.DYNAMIC,
      tokenCount: 2,
      metadata: {},
      createdAt: new Date(),
    }));

    const kept = await service.autoCleanup('session-1', messages, 10);

    expect(kept).toHaveLength(5);
    expect(mockStorage.saveMemory).not.toHaveBeenCalled();
  });

  it('should recall memory from storage', async () => {
    const memories: MemoryEntry[] = [
      { id: 'mem-1', content: 'SOLID principles', category: 'technical', createdAt: new Date(), updatedAt: new Date() },
    ];
    (mockStorage.recallMemory as any).mockResolvedValueOnce(memories);

    const result = await service.recallMemory('SOLID');

    expect(result).toHaveLength(1);
    expect(result[0]!.content).toBe('SOLID principles');
  });
});
