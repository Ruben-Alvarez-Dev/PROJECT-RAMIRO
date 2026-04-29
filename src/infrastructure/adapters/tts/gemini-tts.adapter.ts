// src/infrastructure/adapters/tts/gemini-tts.adapter.ts
// Google Gemini TTS fallback — streaming synthesis

import type { ITTSPort } from '@core/ports/output/tts.port';
import type { AudioBuffer, VoiceConfig, VoiceInfo } from '@core/domain/types';
import { Logger } from '@shared/logging/logger';
import { AdapterError } from '@shared/errors/domain.error';

export class GeminiTTSAdapter implements ITTSPort {
  private readonly logger = new Logger('GeminiTTS');
  private currentVoice: string = 'Aoede';

  constructor(
    private readonly apiKey: string,
  ) {}

  async *synthesize(text: string, voice?: VoiceConfig): AsyncIterable<AudioBuffer> {
    const voiceId = voice?.voiceId ?? this.currentVoice;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['audio'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceId },
              },
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new AdapterError(`Gemini TTS error: ${response.status}`, 'gemini-tts');
    }

    const data = await response.json() as {
      candidates: Array<{
        content: { parts: Array<{ inlineData: { mimeType: string; data: string } }> };
      }>;
    };

    const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('audio/'));
    if (!audioPart?.inlineData) {
      throw new AdapterError('No audio data in Gemini TTS response', 'gemini-tts');
    }

    // Decode base64 PCM audio
    const raw = atob(audioPart.inlineData.data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

    // Convert to Float32 and yield in 200ms chunks
    const samplesPerChunk = 4800; // 200ms at 24kHz
    const view = new DataView(bytes.buffer);
    const totalSamples = Math.floor(bytes.length / 2);

    for (let offset = 0; offset < totalSamples; offset += samplesPerChunk) {
      const end = Math.min(offset + samplesPerChunk, totalSamples);
      const float32 = new Float32Array(end - offset);
      for (let i = 0; i < float32.length; i++) {
        float32[i] = view.getInt16((offset + i) * 2, true) / 32768;
      }
      yield {
        data: float32,
        sampleRate: 24000,
        channels: 1,
        duration: float32.length / 24000,
      };
    }
  }

  async getAvailableVoices(): Promise<VoiceInfo[]> {
    return [
      { voiceId: 'Aoede', name: 'Aoede', language: 'es', gender: 'female' },
      { voiceId: 'Charon', name: 'Charon', language: 'es', gender: 'male' },
      { voiceId: 'Fenrir', name: 'Fenrir', language: 'es', gender: 'male' },
      { voiceId: 'Kore', name: 'Kore', language: 'es', gender: 'female' },
      { voiceId: 'Puck', name: 'Puck', language: 'es', gender: 'neutral' },
    ];
  }

  setVoice(voiceId: string): void {
    this.currentVoice = voiceId;
    this.logger.info('Voice changed', { voiceId });
  }
}
