import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DualModelProcessor } from '@application/services/video/dual-model-processor';
import type { ILLMPort, LLMChunk } from '@core/ports/output/llm.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { LLMRequest, SampledFrame } from '@core/domain/types';

const createMockAdapter = (response: string): ILLMPort => ({
  chat: async function* (req: LLMRequest): AsyncIterable<LLMChunk> {
    yield { content: response };
    yield { content: '', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 5 } };
  },
  chatMultimodal: async function* () { yield { content: response }; },
  getAvailableModels: async () => [],
  estimateTokens: (text: string) => Math.ceil(text.length / 4),
});

const createFailingAdapter = (): ILLMPort => ({
  chat: async function* () { throw new Error('API down'); },
  chatMultimodal: async function* () { throw new Error('API down'); },
  getAvailableModels: async () => [],
  estimateTokens: () => 0,
});

const mockEventBus: IEventBus = {
  emit: vi.fn(),
  on: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  off: vi.fn(),
};

const createMockFrame = (sourceId: string): any => ({
  sourceId,
  timestamp: Date.now(),
  jpegData: 'base64data',
  width: 1280,
  height: 720,
});

describe('DualModelProcessor', () => {
  let processor: DualModelProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process frames through both models in parallel', async () => {
    processor = new DualModelProcessor(
      createMockAdapter('Omni sees a cat'),
      createMockAdapter('Pro analysis: domestic feline'),
      mockEventBus,
    );

    const frames = [createMockFrame('camera-1')];
    const result = await processor.process(frames);

    expect(result.omniResponse).toBe('Omni sees a cat');
    expect(result.proResponse).toBe('Pro analysis: domestic feline');
    expect(result.mergedResponse).toBe('Omni sees a cat'); // omni-primary default
    expect(result.omniLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.proLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should use omni-primary merge strategy by default', async () => {
    processor = new DualModelProcessor(
      createMockAdapter('Omni response'),
      createMockAdapter('Pro response'),
      mockEventBus,
    );

    const result = await processor.process([createMockFrame('cam')]);
    expect(result.mergedResponse).toBe('Omni response');
  });

  it('should use pro-primary merge strategy when configured', async () => {
    processor = new DualModelProcessor(
      createMockAdapter('Omni response'),
      createMockAdapter('Pro response'),
      mockEventBus,
      { mergeStrategy: 'pro-primary' },
    );

    const result = await processor.process([createMockFrame('cam')]);
    expect(result.mergedResponse).toBe('Pro response');
  });

  it('should concat responses with concat strategy', async () => {
    processor = new DualModelProcessor(
      createMockAdapter('First part'),
      createMockAdapter('Second part'),
      mockEventBus,
      { mergeStrategy: 'concat' },
    );

    const result = await processor.process([createMockFrame('cam')]);
    expect(result.mergedResponse).toContain('First part');
    expect(result.mergedResponse).toContain('Second part');
    expect(result.mergedResponse).toContain('---');
  });

  it('should fallback to available model when one fails', async () => {
    processor = new DualModelProcessor(
      createFailingAdapter(),
      createMockAdapter('Pro fallback works'),
      mockEventBus,
    );

    const result = await processor.process([createMockFrame('cam')]);
    expect(result.omniResponse).toBe('');
    expect(result.proResponse).toBe('Pro fallback works');
    expect(result.mergedResponse).toBe('Pro fallback works');
  });

  it('should throw when both models fail', async () => {
    processor = new DualModelProcessor(
      createFailingAdapter(),
      createFailingAdapter(),
      mockEventBus,
    );

    await expect(processor.process([createMockFrame('cam')])).rejects.toThrow('Both OMNI and PRO models failed');
  });

  it('should queue requests when already processing', async () => {
    let resolveFirst: () => void;
    const firstPromise = new Promise<void>(r => { resolveFirst = r; });

    const slowAdapter: ILLMPort = {
      chat: async function* () {
        await firstPromise;
        yield { content: 'slow response' };
      },
      chatMultimodal: async function* () {},
      getAvailableModels: async () => [],
      estimateTokens: () => 10,
    };

    processor = new DualModelProcessor(
      slowAdapter,
      createMockAdapter('fast'),
      mockEventBus,
    );

    // Start first processing (won't complete yet)
    const p1 = processor.process([createMockFrame('cam1')]);
    expect(processor.isProcessing()).toBe(true);

    // Second request should be queued
    const p2 = processor.process([createMockFrame('cam2')]);

    // Complete first
    resolveFirst!();
    const r1 = await p1;
    expect(r1.mergedResponse).toBeTruthy();

    // Second should then process
    const r2 = await p2;
    expect(r2).toBeTruthy();
  });

  it('should include tier0 context in messages', async () => {
    const capturedMessages: any[] = [];
    const captureAdapter: ILLMPort = {
      chat: async function* (req: LLMRequest) {
        capturedMessages.push(...req.messages);
        yield { content: 'response' };
      },
      chatMultimodal: async function* () {},
      getAvailableModels: async () => [],
      estimateTokens: () => 10,
    };

    processor = new DualModelProcessor(
      captureAdapter,
      captureAdapter,
      mockEventBus,
      { systemPrompt: 'You are Ramiro.', tier0Context: 'SOLID principles...' },
    );

    await processor.process([createMockFrame('cam')]);

    const systemMsgs = capturedMessages.filter((m: any) => m.role === 'system');
    expect(systemMsgs.length).toBeGreaterThanOrEqual(2);
    expect(systemMsgs.some((m: any) => m.content === 'You are Ramiro.')).toBe(true);
    expect(systemMsgs.some((m: any) => m.content.includes('TIER 0'))).toBe(true);
  });

  it('should track processing state correctly', async () => {
    processor = new DualModelProcessor(
      createMockAdapter('ok'),
      createMockAdapter('ok'),
      mockEventBus,
    );

    expect(processor.isProcessing()).toBe(false);
    const promise = processor.process([createMockFrame('cam')]);
    // During processing it should be true (async)
    await promise;
    expect(processor.isProcessing()).toBe(false);
  });
});
