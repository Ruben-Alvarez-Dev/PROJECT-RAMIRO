// src/core/ports/output/audio-output.port.ts

import type { AudioBuffer, VoiceConfig, VoiceInfo } from '../../domain/types';

export interface IAudioOutputPort {
  play(audio: AudioBuffer): Promise<void>;
  stop(): Promise<void>;
  setVolume(level: number): void;
  onPlaybackComplete(callback: () => void): void;
}
