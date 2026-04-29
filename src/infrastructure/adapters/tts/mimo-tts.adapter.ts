// src/infrastructure/adapters/tts/mimo-tts.adapter.ts
// Xiaomi MiMo V2 TTS — streaming synthesis with low first-byte latency

import type { ITTSPort } from '@core/ports/output/tts.port';
import type { AudioBuffer, VoiceConfig, VoiceInfo } from '@core/domain/types';
import { Logger } from '@shared/logging/logger';
import { AdapterError } from '@shared/errors/domain.error';

export class MiMoTTSAdapter implements ITTSPort {
  private readonly logger = new Logger('MiMoTTS');
  private currentVoice: string = 'mimo-default';

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = 'https://token-plan-ams.xiaomimimo.com/v1',
  ) {}

  async *synthesize(text: string, voice?: VoiceConfig): AsyncIterable<AudioBuffer> {
    const voiceId = voice?.voiceId ?? this.currentVoice;

    const response = await fetch(`${this.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'mimo-v2-tts',
        input: text,
        voice: voiceId,
        response_format: 'pcm',
        speed: voice?.speed ?? 1.0,
      }),
    });

    if (!response.ok) {
      throw new AdapterError(`MiMo TTS error: ${response.status}`, 'xiaomi-tts');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new AdapterError('No response body from MiMo TTS', 'xiaomi-tts');

    const CHUNK_SIZE = 4800; // 200ms at 24kHz mono
    let buffer = new Uint8Array(0);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer = this.concatBuffers(buffer, value);

      while (buffer.length >= CHUNK_SIZE * 2) { // *2 for 16-bit samples
        const chunkData = buffer.slice(0, CHUNK_SIZE * 2);
        buffer = buffer.slice(CHUNK_SIZE * 2);

        const float32 = new Float32Array(CHUNK_SIZE);
        const view = new DataView(chunkData.buffer);
        for (let i = 0; i < CHUNK_SIZE; i++) {
          float32[i] = view.getInt16(i * 2, true) / 32768;
        }

        yield {
          data: float32,
          sampleRate: 24000,
          channels: 1,
          duration: CHUNK_SIZE / 24000,
        };
      }
    }

    // Flush remaining
    if (buffer.length >= 2) {
      const samples = Math.floor(buffer.length / 2);
      const float32 = new Float32Array(samples);
      const view = new DataView(buffer.buffer);
      for (let i = 0; i < samples; i++) {
        float32[i] = view.getInt16(i * 2, true) / 32768;
      }
      yield {
        data: float32,
        sampleRate: 24000,
        channels: 1,
        duration: samples / 24000,
      };
    }
  }

  async getAvailableVoices(): Promise<VoiceInfo[]> {
    return [
      { voiceId: 'mimo-default', name: 'MiMo Default', language: 'es', gender: 'neutral' },
      { voiceId: 'mimo-male', name: 'MiMo Male', language: 'es', gender: 'male' },
      { voiceId: 'mimo-female', name: 'MiMo Female', language: 'es', gender: 'female' },
    ];
  }

  setVoice(voiceId: string): void {
    this.currentVoice = voiceId;
    this.logger.info('Voice changed', { voiceId });
  }

  private concatBuffers(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
  }
}
