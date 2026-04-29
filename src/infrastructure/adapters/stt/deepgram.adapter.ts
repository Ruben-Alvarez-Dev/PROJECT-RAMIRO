// src/infrastructure/adapters/stt/deepgram.adapter.ts
// Cloud STT fallback via Deepgram Nova-2

import type { ISTTPort } from '@core/ports/output/stt.port';
import type { AudioBuffer, AudioFrame, Transcript, TranscriptChunk } from '@core/domain/types';
import { Logger } from '@shared/logging/logger';
import { AdapterError } from '@shared/errors/domain.error';

export class DeepgramAdapter implements ISTTPort {
  private readonly logger = new Logger('Deepgram');
  private language: string = 'es';
  private ws: WebSocket | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = 'wss://api.deepgram.com/v1/listen',
  ) {}

  async transcribe(audio: AudioBuffer): Promise<Transcript> {
    const url = `${this.baseUrl.replace('wss:', 'https:').replace('/listen', '')}/v1/listen?language=${this.language}&model=nova-2&smart_format=true`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'audio/wav',
      },
      body: this.audioBufferToWav(audio),
    });

    if (!response.ok) {
      throw new AdapterError(`Deepgram API error: ${response.status}`, 'deepgram');
    }

    const data = await response.json() as {
      results: { channels: Array<{ alternatives: Array<{ transcript: string; confidence: number }> }> };
    };

    const alt = data.results.channels[0]?.alternatives[0];
    return {
      text: alt?.transcript ?? '',
      confidence: alt?.confidence ?? 0,
      language: this.language,
      duration: audio.duration,
    };
  }

  async *transcribeStream(audio: ReadableStream<AudioFrame>): AsyncIterable<TranscriptChunk> {
    const wsUrl = `${this.baseUrl}?language=${this.language}&model=nova-2&encoding=linear16&sample_rate=24000&channels=1`;

    this.ws = new WebSocket(wsUrl);
    this.ws.addEventListener('open', () => {
      this.ws!.send(JSON.stringify({ type: 'configure', features: { smart_format: true } }));
    });

    const reader = audio.getReader();
    const messageQueue: TranscriptChunk[] = [];
    let resolveNext: ((value: IteratorResult<TranscriptChunk>) => void) | null = null;

    this.ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data as string);
      const alt = data.channel?.alternatives?.[0];
      if (alt) {
        const chunk: TranscriptChunk = {
          text: alt.transcript,
          isFinal: data.is_final ?? false,
          confidence: alt.confidence ?? 0,
        };
        if (resolveNext) {
          resolveNext({ value: chunk, done: false });
          resolveNext = null;
        } else {
          messageQueue.push(chunk);
        }
      }
    });

    // Send audio frames to Deepgram
    const sendAudio = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(value.data.buffer);
          }
        }
      } finally {
        reader.releaseLock();
      }
    };
    sendAudio();

    // Yield transcripts
    try {
      while (true) {
        if (messageQueue.length > 0) {
          yield messageQueue.shift()!;
        } else {
          const result = await new Promise<IteratorResult<TranscriptChunk>>((resolve) => {
            resolveNext = resolve;
            // Timeout to prevent hanging
            setTimeout(() => {
              if (resolveNext === resolve) {
                resolveNext = null;
                resolve({ value: { text: '', isFinal: false, confidence: 0 }, done: false });
              }
            }, 100);
          });
          if (!result.done) yield result.value;
        }
      }
    } finally {
      this.ws?.close();
      this.ws = null;
    }
  }

  getLanguage(): string {
    return this.language;
  }

  private audioBufferToWav(audio: AudioBuffer): ArrayBuffer {
    const numChannels = audio.channels;
    const sampleRate = audio.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = audio.data.length * bytesPerSample;
    const headerLength = 44;
    const buffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < audio.data.length; i++) {
      const sample = Math.max(-1, Math.min(1, audio.data[i]!));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return buffer;
  }
}
