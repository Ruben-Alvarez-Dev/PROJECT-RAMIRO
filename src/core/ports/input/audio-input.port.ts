// src/core/ports/input/audio-input.port.ts

import type { AudioConfig, AudioDevice, AudioFrame, StreamHandle } from '../../domain/types';

export interface IAudioInputPort {
  startCapture(config: AudioConfig): Promise<StreamHandle>;
  stopCapture(handle: StreamHandle): Promise<void>;
  onFrame(callback: (frame: AudioFrame) => void): void;
  getAvailableDevices(): Promise<AudioDevice[]>;
  selectDevice(deviceId: string): Promise<void>;
}
