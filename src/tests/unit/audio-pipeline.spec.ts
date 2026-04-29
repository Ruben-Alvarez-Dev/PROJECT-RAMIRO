# src/tests/unit/audio-pipeline.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioPipelineService } from '@application/services/audio/audio-pipeline.service';
import type { IAudioInputPort } from '@core/ports/input/audio-input.port';
import type { IAudioOutputPort } from '@core/ports/output/audio-output.port';
import type { ISTTPort } from '@core/ports/output/stt.port';
import type { ITTSPort } from '@core/ports/output/tts.port';
import type { ILLMPort } from '@core/ports/output/llm.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { AudioFrame, StreamHandle, AudioBuffer, Transcript, LLMChunk } from '@core/domain/types';
import { StreamType, StreamStatus } from '@core/domain/enums';

describe('AudioPipelineService', () => {
  let pipeline: AudioPipelineService;
  let frameCallback: ((frame: AudioFrame) => void) | null = null;

  const mockAudioInput: IAudioInputPort = {
    startCapture: vi.fn().mockResolvedValue({
      id: 'handle-1',
      type: StreamType.AUDIO_INPUT,
      status: StreamStatus.ACTIVE,
      startedAt: new Date(),
    } satisfies StreamHandle),
    stopCapture: vi.fn().mockResolvedValue(undefined),
    onFrame: vi.fn().mockImplementation((cb: (frame: AudioFrame) => void) => {
      frameCallback = cb;
    }),
    getAvailableDevices: vi.fn().mockResolvedValue([]),
    selectDevice: vi.fn().mockResolvedValue(undefined),
  };

  const mockAudioOutput: IAudioOutputPort = {
    play: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    setVolume: vi.fn(),
    onPlaybackComplete: vi.fn(),
  };

  const mockSTT: ISTTPort = {
    transcribe: vi.fn().mockResolvedValue({
      text: '¿Qué es SOLID?',
      confidence: 0.95,
      language: 'es',
      duration: 1.5,
    } satisfies Transcript),
    transcribeStream: async function* () {},
    getLanguage: () => 'es',
  };

  const mockTTS: ITTSPort = {
    synthesize: async function* () {
      yield {
        data: new Float32Array(4800).fill(0.1),
        sampleRate: 24000,
        channels: 1,
        duration: 0.2,
      } satisfies AudioBuffer;
    },
    getAvailableVoices: async () => [],
    setVoice: vi.fn(),
  };

  const mockLLM: ILLMPort = {
    chat: async function* () {
      yield { content: 'SOLID ' } as LLMChunk;
      yield { content: 'son 5 principios.' } as LLMChunk;
      yield { content: '', finishReason: 'stop', usage: { promptTokens: 100, completionTokens: 50 } } as LLMChunk;
    },
    chatMultimodal: async function* () {},
    getAvailableModels: async () => [],
    estimateTokens: (text: string) => Math.ceil(text.length / 4),
  };

  const mockEventBus: IEventBus = {
    emit: vi.fn(),
    on: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    off: vi.fn(),
  };

  beforeEach(() => {
    frameCallback = null;
    pipeline = new AudioPipelineService(
      mockAudioInput,
      mockAudioOutput,
      mockSTT,
      mockTTS,
      mockLLM,
      mockEventBus,
    );
    vi.clearAllMocks();
  });

  it('should start pipeline and capture audio', async () => {
    await pipeline.start({ mode: 'always-on' });

    expect(mockAudioInput.startCapture).toHaveBeenCalled();
    expect(mockAudioInput.onFrame).toHaveBeenCalled();
    expect(pipeline.getState().status).toBe('capturing');
  });

  it('should stop pipeline and release resources', async () => {
    await pipeline.start({ mode: 'always-on' });
    await pipeline.stop();

    expect(mockAudioInput.stopCapture).toHaveBeenCalled();
    expect(mockAudioOutput.stop).toHaveBeenCalled();
    expect(pipeline.getState().status).toBe('idle');
  });

  it('should include tier0 context in system prompt', async () => {
    await pipeline.start({
      mode: 'always-on',
      systemPrompt: 'You are Ramiro.',
      tier0Context: 'SOLID principles are...',
    });

    const history = pipeline.getConversationHistory();
    expect(history).toHaveLength(2);
    expect(history[0]!.content).toBe('You are Ramiro.');
    expect(history[1]!.content).toContain('TIER 0');
    expect(history[1]!.content).toContain('SOLID principles are...');
  });

  it('should emit pipeline events', async () => {
    await pipeline.start({ mode: 'always-on' });

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'audio.pipeline.started' }),
    );
  });

  it('should process audio segment through full pipeline', async () => {
    const stateChanges: string[] = [];
    pipeline.onStateChange((state) => stateChanges.push(state.status));

    await pipeline.start({ mode: 'push-to-talk' });
    pipeline.startTalking();

    // Simulate audio segment (speech)
    const segment = new Float32Array(24000); // 1 second
    for (let i = 0; i < segment.length; i++) {
      segment[i] = Math.sin(i * 0.1) * 0.3;
    }

    await pipeline.stopTalking(segment);

    // Allow async processing
    await new Promise(r => setTimeout(r, 100));

    expect(mockSTT.transcribe).toHaveBeenCalled();
    expect(pipeline.getState().currentTranscript).toBe('¿Qué es SOLID?');
    expect(pipeline.getState().lastResponse).toBe('SOLID son 5 principios.');
    expect(pipeline.getConversationHistory().length).toBeGreaterThanOrEqual(2);
  });

  it('should skip processing low-confidence transcripts', async () => {
    (mockSTT.transcribe as any).mockResolvedValueOnce({
      text: '',
      confidence: 0.1,
      language: 'es',
      duration: 0.5,
    });

    await pipeline.start({ mode: 'push-to-talk' });
    pipeline.startTalking();

    const segment = new Float32Array(480).fill(0.001); // Very quiet
    await pipeline.stopTalking(segment);

    await new Promise(r => setTimeout(r, 50));

    expect(pipeline.getState().lastResponse).toBe('');
  });

  it('should handle pipeline errors gracefully', async () => {
    (mockSTT.transcribe as any).mockRejectedValueOnce(new Error('STT service unavailable'));

    await pipeline.start({ mode: 'push-to-talk' });
    pipeline.startTalking();

    const segment = new Float32Array(24000).fill(0.1);
    await pipeline.stopTalking(segment);

    await new Promise(r => setTimeout(r, 100));

    expect(pipeline.getState().status).toBe('error');
    expect(pipeline.getState().error).toContain('STT service unavailable');
  });

  it('should accumulate conversation history', async () => {
    await pipeline.start({ mode: 'push-to-talk' });

    // First utterance
    pipeline.startTalking();
    await pipeline.stopTalking(new Float32Array(24000).fill(0.1));
    await new Promise(r => setTimeout(r, 100));

    const history1 = pipeline.getConversationHistory();
    const userMsgs1 = history1.filter(m => m.role === 'user');
    expect(userMsgs1).toHaveLength(1);

    // Second utterance — STT returns same result but pipeline accumulates
    pipeline.startTalking();
    await pipeline.stopTalking(new Float32Array(24000).fill(0.1));
    await new Promise(r => setTimeout(r, 100));

    const history2 = pipeline.getConversationHistory();
    const userMsgs2 = history2.filter(m => m.role === 'user');
    expect(userMsgs2).toHaveLength(2);
  });
});
