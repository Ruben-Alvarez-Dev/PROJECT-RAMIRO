// src/core/domain/value-objects/audio-config.ts

export interface AudioConfig {
  readonly sampleRate: 16000 | 24000 | 48000;
  readonly channels: 1 | 2;
  readonly bitDepth: 16 | 24 | 32;
  readonly codec: 'pcm' | 'opus' | 'aac';
  readonly echoCancellation: boolean;
  readonly noiseSuppression: boolean;
  readonly autoGainControl: boolean;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 24000,
  channels: 1,
  bitDepth: 16,
  codec: 'opus',
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
