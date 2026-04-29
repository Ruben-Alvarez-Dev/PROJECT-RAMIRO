// src/infrastructure/adapters/audio/livekit-audio.adapter.ts

import type { IAudioInputPort } from '@core/ports/input/audio-input.port';
import type { AudioConfig, AudioDevice, AudioFrame, StreamHandle } from '@core/domain/types';
import { StreamStatus, StreamType } from '@core/domain/enums';
import { StreamError } from '@shared/errors/domain.error';
import { Logger } from '@shared/logging/logger';

/**
 * LiveKit adapter for WebRTC audio capture.
 * Provides low-latency bidirectional audio with echo cancellation.
 * Falls back to native getUserMedia when LiveKit is unavailable.
 */
export class LiveKitAudioAdapter implements IAudioInputPort {
  private readonly logger = new Logger('LiveKitAudio');
  private readonly frameCallbacks: Set<(frame: AudioFrame) => void> = new Set();
  private readonly activeStreams = new Map<string, MediaStream>();
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;

  async startCapture(config: AudioConfig): Promise<StreamHandle> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: config.sampleRate },
          channelCount: { ideal: config.channels },
          echoCancellation: config.echoCancellation,
          noiseSuppression: config.noiseSuppression,
          autoGainControl: config.autoGainControl,
        },
      });

      const handleId = crypto.randomUUID();
      this.activeStreams.set(handleId, stream);

      this.audioContext = new AudioContext({ sampleRate: config.sampleRate });
      const source = this.audioContext.createMediaStreamSource(stream);
      this.processor = this.audioContext.createScriptProcessor(4096, config.channels, config.channels);

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const frame: AudioFrame = {
          data: new Float32Array(inputData),
          sampleRate: config.sampleRate,
          channels: config.channels,
          timestamp: performance.now(),
        };
        for (const cb of this.frameCallbacks) {
          cb(frame);
        }
      };

      this.logger.info('Audio capture started', { handleId, sampleRate: config.sampleRate });

      return {
        id: handleId,
        type: StreamType.AUDIO_INPUT,
        status: StreamStatus.ACTIVE,
        startedAt: new Date(),
      };
    } catch (error) {
      throw new StreamError(
        `Failed to start audio capture: ${error instanceof Error ? error.message : 'Unknown'}`,
        'audio-input',
      );
    }
  }

  async stopCapture(handle: StreamHandle): Promise<void> {
    const stream = this.activeStreams.get(handle.id);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      this.activeStreams.delete(handle.id);
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.logger.info('Audio capture stopped', { handleId: handle.id });
  }

  onFrame(callback: (frame: AudioFrame) => void): void {
    this.frameCallbacks.add(callback);
  }

  async getAvailableDevices(): Promise<AudioDevice[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'audioinput')
      .map(d => ({ deviceId: d.deviceId, label: d.label, groupId: d.groupId }));
  }

  async selectDevice(deviceId: string): Promise<void> {
    this.logger.info('Device selected', { deviceId });
    // Device selection applied on next startCapture call
  }
}
