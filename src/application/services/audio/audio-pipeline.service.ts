// src/application/services/audio/audio-pipeline.service.ts
// Full audio pipeline: Mic → VAD → STT → LLM → TTS → Speaker

import type { IAudioInputPort } from '@core/ports/input/audio-input.port';
import type { IAudioOutputPort } from '@core/ports/output/audio-output.port';
import type { ISTTPort } from '@core/ports/output/stt.port';
import type { ITTSPort } from '@core/ports/output/tts.port';
import type { ILLMPort } from '@core/ports/output/llm.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { AudioConfig, AudioFrame, LLMMessage, StreamHandle } from '@core/domain/types';
import { DEFAULT_AUDIO_CONFIG } from '@core/domain/value-objects/audio-config';
import { VADProcessor, VADState, type VADEvent } from './vad-processor';
import { Logger } from '@shared/logging/logger';

export interface AudioPipelineConfig {
  audioConfig?: AudioConfig;
  systemPrompt?: string;
  tier0Context?: string;
  vadEnergyThreshold?: number;
  mode: 'push-to-talk' | 'always-on';
}

export interface AudioPipelineState {
  status: 'idle' | 'capturing' | 'listening' | 'processing' | 'speaking' | 'error';
  currentTranscript: string;
  lastResponse: string;
  latencyMs: number;
  error?: string;
}

export type PipelineStateCallback = (state: AudioPipelineState) => void;

/**
 * AudioPipelineService orchestrates the complete voice conversation flow:
 * Mic capture → VAD → STT → Context assembly → LLM → TTS → Speaker playback.
 * Supports push-to-talk and always-on (VAD) modes.
 */
export class AudioPipelineService {
  private readonly logger = new Logger('AudioPipeline');
  private readonly vad: VADProcessor;
  private readonly stateCallbacks: Set<PipelineStateCallback> = new Set();
  private currentState: AudioPipelineState = {
    status: 'idle',
    currentTranscript: '',
    lastResponse: '',
    latencyMs: 0,
  };
  private handle: StreamHandle | null = null;
  private isProcessing = false;
  private conversationHistory: LLMMessage[] = [];

  constructor(
    private readonly audioInput: IAudioInputPort,
    private readonly audioOutput: IAudioOutputPort,
    private readonly stt: ISTTPort,
    private readonly tts: ITTSPort,
    private readonly llm: ILLMPort,
    private readonly eventBus: IEventBus,
  ) {
    this.vad = new VADProcessor();
    this.vad.onEvent(this.handleVADEvent.bind(this));
  }

  onStateChange(callback: PipelineStateCallback): void {
    this.stateCallbacks.add(callback);
  }

  async start(config: AudioPipelineConfig): Promise<void> {
    const audioConfig = config.audioConfig ?? DEFAULT_AUDIO_CONFIG;

    // Build system context
    if (config.systemPrompt) {
      this.conversationHistory = [{ role: 'system', content: config.systemPrompt }];
    }
    if (config.tier0Context) {
      this.conversationHistory.push({
        role: 'system',
        content: `[TIER 0 — Sacred Word]\n${config.tier0Context}`,
      });
    }

    // Start audio capture
    this.handle = await this.audioInput.startCapture(audioConfig);
    this.updateState({ status: 'capturing' });

    // Wire audio frames through VAD
    this.audioInput.onFrame((frame: AudioFrame) => {
      if (config.mode === 'always-on') {
        this.vad.processFrame(frame.data, frame.timestamp);
      }
      // In push-to-talk mode, frames are buffered until button release
    });

    this.eventBus.emit({
      type: 'audio.pipeline.started',
      payload: { mode: config.mode },
      timestamp: new Date(),
    });

    this.logger.info('Audio pipeline started', { mode: config.mode });
  }

  async stop(): Promise<void> {
    if (this.handle) {
      await this.audioInput.stopCapture(this.handle);
      this.handle = null;
    }
    this.audioOutput.stop();
    this.vad.reset();
    this.updateState({ status: 'idle' });

    this.eventBus.emit({
      type: 'audio.pipeline.stopped',
      payload: {},
      timestamp: new Date(),
    });
  }

  /**
   * Manual trigger for push-to-talk mode.
   * Call startTalking() on button press, stopTalking() on release.
   */
  startTalking(): void {
    this.vad.reset();
    this.updateState({ status: 'listening' });
  }

  async stopTalking(audioSegment?: Float32Array): Promise<void> {
    if (audioSegment) {
      await this.processAudioSegment(audioSegment);
    }
  }

  private async handleVADEvent(event: VADEvent): void {
    switch (event.state) {
      case VADState.SPEECH:
        this.updateState({ status: 'listening' });
        break;

      case VADState.END_OF_SPEECH:
        if (event.audioSegment && event.audioSegment.length > 0) {
          await this.processAudioSegment(event.audioSegment);
        }
        break;
    }
  }

  private async processAudioSegment(segment: Float32Array): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const pipelineStart = performance.now();

    try {
      this.updateState({ status: 'processing' });

      // 1. STT — Transcribe audio to text
      const transcript = await this.stt.transcribe({
        data: segment,
        sampleRate: 24000,
        channels: 1,
        duration: segment.length / 24000,
      });

      if (!transcript.text.trim() || transcript.confidence < 0.3) {
        this.updateState({ status: 'capturing' });
        this.isProcessing = false;
        return;
      }

      this.updateState({ currentTranscript: transcript.text });

      this.eventBus.emit({
        type: 'audio.transcript.received',
        payload: { text: transcript.text, confidence: transcript.confidence },
        timestamp: new Date(),
      });

      // 2. Add user message to conversation
      this.conversationHistory.push({ role: 'user', content: transcript.text });

      // 3. LLM — Generate response
      let fullResponse = '';
      for await (const chunk of this.llm.chat({
        messages: this.conversationHistory,
        stream: true,
        temperature: 0.1,
      })) {
        fullResponse += chunk.content;
      }

      this.conversationHistory.push({ role: 'assistant', content: fullResponse });
      this.updateState({ lastResponse: fullResponse });

      this.eventBus.emit({
        type: 'llm.response.generated',
        payload: { text: fullResponse, transcriptText: transcript.text },
        timestamp: new Date(),
      });

      // 4. TTS — Synthesize and play response
      this.updateState({ status: 'speaking' });
      for await (const audioChunk of this.tts.synthesize(fullResponse)) {
        await this.audioOutput.play(audioChunk);
      }

      const latencyMs = performance.now() - pipelineStart;
      this.updateState({ status: 'capturing', latencyMs });

      this.eventBus.emit({
        type: 'audio.response.played',
        payload: { latencyMs, responseLength: fullResponse.length },
        timestamp: new Date(),
      });

      this.logger.info('Pipeline cycle complete', {
        latencyMs: Math.round(latencyMs),
        transcriptLength: transcript.text.length,
        responseLength: fullResponse.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown pipeline error';
      this.updateState({ status: 'error', error: message });
      this.logger.error('Pipeline error', error instanceof Error ? error : new Error(message));
    } finally {
      this.isProcessing = false;
    }
  }

  private updateState(partial: Partial<AudioPipelineState>): void {
    this.currentState = { ...this.currentState, ...partial };
    for (const cb of this.stateCallbacks) {
      try { cb(this.currentState); } catch {}
    }
  }

  getState(): AudioPipelineState {
    return { ...this.currentState };
  }

  getConversationHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }
}
