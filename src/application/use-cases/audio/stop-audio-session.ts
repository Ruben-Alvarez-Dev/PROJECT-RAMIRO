// src/application/use-cases/audio/stop-audio-session.ts

import type { IAudioInputPort } from '@core/ports/input/audio-input.port';
import type { IAudioOutputPort } from '@core/ports/output/audio-output.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { StreamHandle } from '@core/domain/types';

export interface StopAudioSessionInput {
  readonly sessionId: string;
  readonly handle: StreamHandle;
}

export interface StopAudioSessionOutput {
  readonly sessionId: string;
  readonly status: 'stopped' | 'error';
  readonly error?: string;
}

export class StopAudioSession {
  constructor(
    private readonly audioInput: IAudioInputPort,
    private readonly audioOutput: IAudioOutputPort,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: StopAudioSessionInput): Promise<StopAudioSessionOutput> {
    try {
      await this.audioInput.stopCapture(input.handle);
      this.audioOutput.stop();

      this.eventBus.emit({
        type: 'audio.session.stopped',
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
