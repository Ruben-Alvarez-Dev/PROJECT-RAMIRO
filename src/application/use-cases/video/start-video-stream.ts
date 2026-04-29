// src/application/use-cases/video/start-video-stream.ts

import type { IVideoInputPort } from '@core/ports/input/video-input.port';
import type { ILLMPort } from '@core/ports/output/llm.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { VideoSource, VideoFrame, LLMMessage, ImageBuffer } from '@core/domain/types';
import { ModelRole } from '@core/domain/enums';

export interface StartVideoStreamInput {
  readonly sessionId: string;
  readonly sources: VideoSource[];  // up to 4
  readonly fps?: number;            // per source, default 5
  readonly systemPrompt?: string;
  readonly tier0Context?: string;
}

export interface StartVideoStreamOutput {
  readonly sessionId: string;
  readonly handles: string[];
  readonly status: 'streaming' | 'error';
  readonly error?: string;
}

export class StartVideoStream {
  constructor(
    private readonly videoInput: IVideoInputPort,
    private readonly omni: ILLMPort,
    private readonly pro: ILLMPort,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: StartVideoStreamInput): Promise<StartVideoStreamOutput> {
    const maxSources = Math.min(input.sources.length, 4);
    const fps = input.fps ?? 5;
    const handles: string[] = [];
    const frameBuffers: Map<string, VideoFrame[]> = new Map();

    try {
      // Start capture for each source (up to 4)
      for (let i = 0; i < maxSources; i++) {
        const source = input.sources[i]!;
        const handle = await this.videoInput.startCapture(source);
        handles.push(handle.id);
        frameBuffers.set(source.id, []);

        this.videoInput.setFPS(handle, fps);
      }

      // Process frames from all sources
      this.videoInput.onFrame(async (frame) => {
        const buffer = frameBuffers.get(frame.sourceId);
        if (!buffer) return;
        buffer.push(frame);

        // Keep only last N frames per source (ring buffer)
        if (buffer.length > fps * 10) {
          buffer.splice(0, buffer.length - fps * 5);
        }

        this.eventBus.emit({
          type: 'video.frame.received',
          payload: { sessionId: input.sessionId, sourceId: frame.sourceId, timestamp: frame.timestamp },
          timestamp: new Date(),
        });

        // Build multimodal request with latest frames from all sources
        const messages: LLMMessage[] = [];
        if (input.systemPrompt) {
          messages.push({ role: 'system', content: input.systemPrompt });
        }
        if (input.tier0Context) {
          messages.push({ role: 'system', content: `[TIER 0 — Sacred Word]\n${input.tier0Context}` });
        }

        const latestImages: ImageBuffer[] = [];
        for (const [, frames] of frameBuffers) {
          const latest = frames[frames.length - 1];
          if (latest) {
            latestImages.push({
              data: new Uint8Array(0), // actual frame data extracted by adapter
              width: latest.width,
              height: latest.height,
              mimeType: 'image/jpeg',
            });
          }
        }

        messages.push({ role: 'user', content: '[Live video frames attached]' });

        // Parallel processing: OMNI + PRO
        const [omniStream, proStream] = await Promise.all([
          this.omni.chatMultimodal({ messages, images: latestImages, stream: true }),
          this.pro.chatMultimodal({ messages, images: latestImages, stream: true }),
        ]);

        this.eventBus.emit({
          type: 'video.models.processing',
          payload: { sessionId: input.sessionId, sources: maxSources },
          timestamp: new Date(),
        });

        // Collect responses from both models
        let omniResponse = '';
        let proResponse = '';

        for await (const chunk of omniStream) {
          omniResponse += chunk.content;
        }
        for await (const chunk of proStream) {
          proResponse += chunk.content;
        }

        this.eventBus.emit({
          type: 'video.response.generated',
          payload: {
            sessionId: input.sessionId,
            omniResponse,
            proResponse,
            merged: true,
          },
          timestamp: new Date(),
        });
      });

      return { sessionId: input.sessionId, handles, status: 'streaming' };
    } catch (error) {
      return {
        sessionId: input.sessionId,
        handles,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
