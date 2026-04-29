// src/application/services/video/video-pipeline.service.ts
// Full video pipeline: 1-4 sources → FrameSampler → DualModelProcessor (OMNI+PRO) → TTS
// Supports camera, screen, window, app, and OBS sources simultaneously.

import type { IVideoInputPort } from '@core/ports/input/video-input.port';
import type { IAudioOutputPort } from '@core/ports/output/audio-output.port';
import type { ISTTPort } from '@core/ports/output/stt.port';
import type { ITTSPort } from '@core/ports/output/tts.port';
import type { ILLMPort } from '@core/ports/output/llm.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { StreamHandle, LLMMessage } from '@core/domain/types';
import { FrameSampler, type SampledFrame, type FrameSamplerConfig } from './frame-sampler';
import { DualModelProcessor, type DualProcessorConfig, type DualProcessResult } from './dual-model-processor';
import { Logger } from '@shared/logging/logger';

export interface VideoPipelineConfig {
  readonly sources: VideoSourceInput[];
  readonly fpsPerSource?: number;
  readonly systemPrompt?: string;
  readonly tier0Context?: string;
  readonly mergeStrategy?: DualProcessorConfig['mergeStrategy'];
  readonly autoSpeak?: boolean;
  readonly enableConcurrentAudio?: boolean;
}

export interface VideoSourceInput {
  readonly id: string;
  readonly name: string;
  readonly type: 'camera' | 'screen' | 'window' | 'app' | 'obs';
  readonly stream: MediaStream;
}

export interface VideoPipelineState {
  status: 'idle' | 'connecting' | 'streaming' | 'processing' | 'speaking' | 'error';
  activeSources: number;
  totalFrames: number;
  lastResult?: DualProcessResult;
  error?: string;
}

export type VideoStateCallback = (state: VideoPipelineState) => void;

export class VideoPipelineService {
  private readonly logger = new Logger('VideoPipeline');
  private readonly sampler: FrameSampler;
  private readonly processor: DualModelProcessor;
  private readonly stateCallbacks: Set<VideoStateCallback> = new Set();
  private readonly sourceHandles = new Map<string, string>(); // sourceId → handleId
  private currentState: VideoPipelineState = {
    status: 'idle',
    activeSources: 0,
    totalFrames: 0,
  };
  private conversationHistory: LLMMessage[] = [];
  private isRunning = false;
  private processTimer: ReturnType<typeof setInterval> | null = null;
  private totalFrames = 0;

  constructor(
    private readonly videoInput: IVideoInputPort,
    private readonly audioOutput: IAudioOutputPort,
    private readonly stt: ISTTPort,
    private readonly tts: ITTSPort,
    private readonly omni: ILLMPort,
    private readonly pro: ILLMPort,
    private readonly eventBus: IEventBus,
  ) {
    this.sampler = new FrameSampler();
    this.processor = new DualModelProcessor(omni, pro, eventBus);

    // Track frame count
    this.sampler.onFrame(() => {
      this.totalFrames++;
    });
  }

  onStateChange(callback: VideoStateCallback): void {
    this.stateCallbacks.add(callback);
  }

  async start(config: VideoPipelineConfig): Promise<void> {
    if (config.sources.length === 0) throw new Error('At least one source required');
    if (config.sources.length > 4) throw new Error('Maximum 4 sources allowed');

    this.updateState({ status: 'connecting' });

    // Update processor config
    this.processor.updateConfig({
      systemPrompt: config.systemPrompt,
      tier0Context: config.tier0Context,
      mergeStrategy: config.mergeStrategy ?? 'omni-primary',
    });

    // Build conversation context
    if (config.systemPrompt) {
      this.conversationHistory = [{ role: 'system', content: config.systemPrompt }];
    }
    if (config.tier0Context) {
      this.conversationHistory.push({
        role: 'system',
        content: `[TIER 0 — Sacred Word]\n${config.tier0Context}`,
      });
    }

    // Add all sources to sampler
    for (const source of config.sources) {
      await this.sampler.addSource(source.id, source.name, source.type, source.stream);
      this.logger.info('Source added', { id: source.id, type: source.type, name: source.name });
    }

    // Set FPS if provided
    if (config.fpsPerSource) {
      const samplerConfig: Partial<FrameSamplerConfig> = { fpsPerSource: config.fpsPerSource };
      // Apply to all sources
      for (const source of config.sources) {
        this.sampler.setFPS(source.id, config.fpsPerSource);
      }
    }

    this.isRunning = true;
    this.updateState({ status: 'streaming', activeSources: config.sources.length });

    // Start periodic dual-model processing
    // Process every 2 seconds (at 5fps, that's every 10 frames per source)
    this.processTimer = setInterval(async () => {
      if (!this.isRunning || this.processor.isProcessing()) return;

      const latestFrames = this.sampler.getLatestFrames();
      if (latestFrames.length === 0) return;

      this.updateState({ status: 'processing' });

      try {
        const result = await this.processor.process(
          latestFrames,
          undefined,
          this.conversationHistory,
        );

        // Add to conversation history
        this.conversationHistory.push({
          role: 'user',
          content: `[Video frames from ${latestFrames.length} sources]`,
        });
        this.conversationHistory.push({
          role: 'assistant',
          content: result.mergedResponse,
        });

        // Auto-cleanup conversation history (keep last 20 messages + system)
        if (this.conversationHistory.length > 22) {
          const systemMsgs = this.conversationHistory.filter(m => m.role === 'system');
          const recentMsgs = this.conversationHistory
            .filter(m => m.role !== 'system')
            .slice(-20);
          this.conversationHistory = [...systemMsgs, ...recentMsgs];
        }

        this.updateState({ status: 'streaming', lastResult: result, totalFrames: this.totalFrames });

        // Auto-speak if enabled
        if (config.autoSpeak && result.mergedResponse) {
          this.updateState({ status: 'speaking' });
          for await (const audioChunk of this.tts.synthesize(result.mergedResponse)) {
            await this.audioOutput.play(audioChunk);
          }
          this.updateState({ status: 'streaming' });
        }

        this.eventBus.emit({
          type: 'video.pipeline.cycle',
          payload: {
            sourceCount: latestFrames.length,
            omniLatencyMs: Math.round(result.omniLatencyMs),
            proLatencyMs: Math.round(result.proLatencyMs),
            responseLength: result.mergedResponse.length,
            totalFrames: this.totalFrames,
          },
          timestamp: new Date(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Processing error';
        this.updateState({ status: 'error', error: message });
        this.logger.error('Pipeline cycle error', error instanceof Error ? error : new Error(message));
        // Auto-recover to streaming state after error
        setTimeout(() => {
          if (this.isRunning) this.updateState({ status: 'streaming', error: undefined });
        }, 2000);
      }
    }, 2000);

    this.eventBus.emit({
      type: 'video.pipeline.started',
      payload: { sourceCount: config.sources.length, fps: config.fpsPerSource ?? 5 },
      timestamp: new Date(),
    });

    this.logger.info('Video pipeline started', { sources: config.sources.length });
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }

    this.sampler.stopAll();
    this.updateState({ status: 'idle', activeSources: 0 });

    this.eventBus.emit({
      type: 'video.pipeline.stopped',
      payload: { totalFrames: this.totalFrames },
      timestamp: new Date(),
    });

    this.logger.info('Video pipeline stopped', { totalFrames: this.totalFrames });
  }

  getState(): VideoPipelineState {
    return { ...this.currentState };
  }

  getConversationHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }

  getActiveSources(): Array<{ id: string; name: string; type: string }> {
    return this.sampler.getSources();
  }

  isProcessorBusy(): boolean {
    return this.processor.isProcessing();
  }

  private updateState(partial: Partial<VideoPipelineState>): void {
    this.currentState = { ...this.currentState, ...partial };
    for (const cb of this.stateCallbacks) {
      try { cb(this.currentState); } catch {}
    }
  }
}
