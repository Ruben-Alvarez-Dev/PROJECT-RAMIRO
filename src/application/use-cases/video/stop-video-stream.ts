// src/application/use-cases/video/stop-video-stream.ts

import type { IVideoInputPort } from '@core/ports/input/video-input.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';

export interface StopVideoStreamInput {
  readonly sessionId: string;
  readonly handles: string[];
}

export interface StopVideoStreamOutput {
  readonly sessionId: string;
  readonly status: 'stopped' | 'error';
  readonly error?: string;
}

export class StopVideoStream {
  constructor(
    private readonly videoInput: IVideoInputPort,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: StopVideoStreamInput): Promise<StopVideoStreamOutput> {
    try {
      for (const handleId of input.handles) {
        await this.videoInput.stopCapture({ id: handleId } as any);
      }

      this.eventBus.emit({
        type: 'video.session.stopped',
        payload: { sessionId: input.sessionId },
        timestamp: new Date(),
      });

      return { sessionId: input.sessionId, status: 'stopped' };
    } catch (error) {
      return {
        sessionId: input.sessionId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
