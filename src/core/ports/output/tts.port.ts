// src/core/ports/output/tts.port.ts

import type { AudioBuffer, VoiceConfig, VoiceInfo } from '../../domain/types';

export interface ITTSPort {
  synthesize(text: string, voice?: VoiceConfig): AsyncIterable<AudioBuffer>;
  getAvailableVoices(): Promise<VoiceInfo[]>;
  setVoice(voiceId: string): void;
}
