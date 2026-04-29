// src/application/services/video/dual-model-processor.ts
// Processes video frames through OMNI + PRO models simultaneously.
// OMNI: realtime visual understanding, fast responses.
// PRO: deep analysis, structured reasoning, long-form output.
// Both models receive the same multimodal input and their responses are merged.

import type { ILLMPort } from '@core/ports/output/llm.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { LLMMessage, LLMChunk, ModelConfig } from '@core/domain/types';
import type { SampledFrame } from './frame-sampler';
import { Logger } from '@shared/logging/logger';

export interface DualProcessResult {
  readonly omniResponse: string;
  readonly proResponse: string;
  readonly mergedResponse: string;
  readonly omniLatencyMs: number;
  readonly proLatencyMs: number;
  readonly timestamp: number;
}

export interface DualProcessorConfig {
  readonly mergeStrategy: 'concat' | 'omni-primary' | 'pro-primary' | 'interleave';
  readonly systemPrompt?: string;
  readonly tier0Context?: string;
  readonly maxResponseTokens: number;
}

const DEFAULT_DUAL_CONFIG: DualProcessorConfig = {
  mergeStrategy: 'omni-primary',
  maxResponseTokens: 4096,
};

export class DualModelProcessor {
  private readonly logger = new Logger('DualModelProcessor');
  private config: DualProcessorConfig;
  private processing = false;
  private processQueue: Array<{ frames: SampledFrame[]; textContext?: string; resolve: (r: DualProcessResult) => void }> = [];

  constructor(
    private readonly omni: ILLMPort,
    private readonly pro: ILLMPort,
    private readonly eventBus: IEventBus,
    config: Partial<DualProcessorConfig> = {},
  ) {
    this.config = { ...DEFAULT_DUAL_CONFIG, ...config };
  }

  updateConfig(config: Partial<DualProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async process(
    frames: SampledFrame[],
    textContext?: string,
    conversationHistory?: LLMMessage[],
  ): Promise<DualProcessResult> {
    // Queue if already processing to prevent frame drops
    if (this.processing) {
      return new Promise((resolve) => {
        this.processQueue.push({ frames, textContext, resolve });
      });
    }

    this.processing = true;

    try {
      const messages = this.buildMessages(frames, textContext, conversationHistory);

      // Parallel processing — both models run simultaneously
      const omniStart = performance.now();
      const proStart = performance.now();

      const [omniResult, proResult] = await Promise.allSettled([
        this.streamToCompletion(this.omni, messages),
        this.streamToCompletion(this.pro, messages),
      ]);

      const omniLatencyMs = performance.now() - omniStart;
      const proLatencyMs = performance.now() - proStart;

      const omniResponse = omniResult.status === 'fulfilled' ? omniResult.value : '';
      const proResponse = proResult.status === 'fulfilled' ? proResult.value : '';

      // Fallback if one model fails
      if (!omniResponse && !proResponse) {
        throw new Error('Both OMNI and PRO models failed');
      }

      const mergedResponse = this.mergeResponses(omniResponse, proResponse);

      const result: DualProcessResult = {
        omniResponse,
        proResponse,
        mergedResponse,
        omniLatencyMs,
        proLatencyMs,
        timestamp: Date.now(),
      };

      this.eventBus.emit({
        type: 'video.dual.processed',
        payload: {
          omniLatencyMs: Math.round(omniLatencyMs),
          proLatencyMs: Math.round(proLatencyMs),
          omniLength: omniResponse.length,
          proLength: proResponse.length,
          mergedLength: mergedResponse.length,
          frameCount: frames.length,
        },
        timestamp: new Date(),
      });

      this.logger.info('Dual processing complete', {
        omniMs: Math.round(omniLatencyMs),
        proMs: Math.round(proLatencyMs),
        frames: frames.length,
      });

      return result;
    } finally {
      this.processing = false;
      // Process next in queue
      const next = this.processQueue.shift();
      if (next) {
        this.process(next.frames, next.textContext).then(next.resolve);
      }
    }
  }

  isProcessing(): boolean {
    return this.processing;
  }

  private buildMessages(
    frames: SampledFrame[],
    textContext?: string,
    history?: LLMMessage[],
  ): LLMMessage[] {
    const messages: LLMMessage[] = [];

    // System prompt
    if (this.config.systemPrompt) {
      messages.push({ role: 'system', content: this.config.systemPrompt });
    }

    // TIER 0 sacred context
    if (this.config.tier0Context) {
      messages.push({ role: 'system', content: `[TIER 0 — Sacred Word]\n${this.config.tier0Context}` });
    }

    // Conversation history (last 5 turns)
    if (history && history.length > 0) {
      const recent = history.slice(-10);
      messages.push(...recent);
    }

    // Current frame descriptions + text context
    let frameDescription = '[Live Video Frames]\n';
    for (const frame of frames) {
      frameDescription += `Source: ${frame.sourceId} | ${frame.width}x${frame.height} | ${new Date(frame.timestamp).toISOString()}\n`;
    }
    if (textContext) {
      frameDescription += `\nAdditional context: ${textContext}`;
    }

    messages.push({
      role: 'user',
      content: frameDescription,
      images: frames.map(f => `data:image/jpeg;base64,${f.jpegData}`),
    });

    return messages;
  }

  private async streamToCompletion(adapter: ILLMPort, messages: LLMMessage[]): Promise<string> {
    let full = '';
    for await (const chunk of adapter.chat({ messages, stream: true, temperature: 0.1 })) {
      full += chunk.content;
    }
    return full;
  }

  private mergeResponses(omni: string, pro: string): string {
    switch (this.config.mergeStrategy) {
      case 'omni-primary':
        // OMNI provides the primary response, PRO adds depth if available
        if (!omni) return pro;
        if (!pro) return omni;
        return omni;

      case 'pro-primary':
        if (!pro) return omni;
        if (!omni) return pro;
        return pro;

      case 'concat':
        return [omni, pro].filter(Boolean).join('\n\n---\n\n');

      case 'interleave': {
        const omniSentences = omni.split(/(?<=[.!?])\s+/);
        const proSentences = pro.split(/(?<=[.!?])\s+/);
        const merged: string[] = [];
        const max = Math.max(omniSentences.length, proSentences.length);
        for (let i = 0; i < max; i++) {
          if (omniSentences[i]) merged.push(omniSentences[i]!);
          if (proSentences[i]) merged.push(proSentences[i]!);
        }
        return merged.join(' ');
      }

      default:
        return omni || pro;
    }
  }
}
