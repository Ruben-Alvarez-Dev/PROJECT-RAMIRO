# src/tests/unit/orchestrator.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrchestratorService } from '@application/services/orchestrator.service';
import type { ILLMPort, LLMChunk } from '@core/ports/output/llm.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { LLMRequest, ModelConfig } from '@core/domain/types';
import { ModelRole } from '@core/domain/enums';
import { DEFAULT_MODEL_CONFIG } from '@core/domain/value-objects/model-config';

describe('OrchestratorService', () => {
  const createMockAdapter = (response: string): ILLMPort => ({
    chat: async function* (req: LLMRequest): AsyncIterable<LLMChunk> {
      yield { content: response };
      yield { content: '', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 5 } };
    },
    chatMultimodal: async function* () { yield { content: response }; },
    getAvailableModels: async () => [],
    estimateTokens: (text: string) => Math.ceil(text.length / 4),
  });

  const mockEventBus: IEventBus = {
    emit: vi.fn(),
    on: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    off: vi.fn(),
  };

  let adapters: Map<string, ILLMPort>;
  let orchestrator: OrchestratorService;

  beforeEach(() => {
    adapters = new Map([
      ['xiaomi', createMockAdapter('Xiaomi response')],
      ['qwen', createMockAdapter('Qwen fallback response')],
    ]);
    orchestrator = new OrchestratorService(adapters, mockEventBus);
  });

  it('should route OMNI requests to xiaomi provider', async () => {
    const result = await orchestrator.execute({
      messages: [{ role: 'user', content: 'Describe this image' }],
      modelConfig: DEFAULT_MODEL_CONFIG,
      role: ModelRole.OMNI,
    });

    expect(result.content).toBe('Xiaomi response');
    expect(result.provider).toBe('xiaomi');
  });

  it('should route PRO requests to xiaomi provider', async () => {
    const result = await orchestrator.execute({
      messages: [{ role: 'user', content: 'Analyze this document' }],
      modelConfig: DEFAULT_MODEL_CONFIG,
      role: ModelRole.PRO,
    });

    expect(result.content).toBe('Xiaomi response');
  });

  it('should fall back when primary adapter throws', async () => {
    const failingAdapter: ILLMPort = {
      chat: async function* () { throw new Error('API down'); },
      chatMultimodal: async function* () { throw new Error('API down'); },
      getAvailableModels: async () => [],
      estimateTokens: () => 0,
    };

    adapters.set('xiaomi', failingAdapter);
    orchestrator = new OrchestratorService(adapters, mockEventBus);

    const result = await orchestrator.execute({
      messages: [{ role: 'user', content: 'test' }],
      modelConfig: DEFAULT_MODEL_CONFIG,
      role: ModelRole.OMNI,
    });

    expect(result.content).toBe('Qwen fallback response');
    expect(result.provider).toBe('qwen');
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'orchestrator.failover' }));
  });

  it('should throw when no adapter and no fallback available', async () => {
    adapters.clear();
    orchestrator = new OrchestratorService(adapters, mockEventBus);

    await expect(orchestrator.execute({
      messages: [{ role: 'user', content: 'test' }],
      modelConfig: DEFAULT_MODEL_CONFIG,
      role: ModelRole.OMNI,
    })).rejects.toThrow('No adapter found');
  });
});
