// src/infrastructure/adapters/stt/whisperkit.adapter.ts
// Native macOS STT using WhisperKit on Apple Silicon

import type { ISTTPort } from '@core/ports/output/stt.port';
import type { AudioBuffer, AudioFrame, Transcript, TranscriptChunk } from '@core/domain/types';
import { Logger } from '@shared/logging/logger';
import { AdapterError } from '@shared/errors/domain.error';

/**
 * WhisperKit adapter — on-device STT for Apple Silicon.
 * Zero latency, no API calls, runs entirely on Neural Engine.
 * Invoked via Tauri's Swift bridge on macOS.
 */
export class WhisperKitAdapter implements ISTTPort {
  private readonly logger = new Logger('WhisperKit');
  private readonly modelPath: string;
  private language: string = 'es';

  constructor(
    private readonly invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>,
    modelPath: string = 'whisperkit-base',
  ) {
    this.modelPath = modelPath;
  }

  async transcribe(audio: AudioBuffer): Promise<Transcript> {
    try {
      const result = await this.invoke('whisperkit_transcribe', {
        audioData: Array.from(audio.data),
        sampleRate: audio.sampleRate,
        language: this.language,
        model: this.modelPath,
      }) as { text: string; confidence: number; duration: number };

      return {
        text: result.text,
        confidence: result.confidence,
        language: this.language,
        duration: result.duration,
      };
    } catch (error) {
      throw new AdapterError(
        `WhisperKit transcription failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        'whisperkit',
      );
    }
  }

  async *transcribeStream(audio: ReadableStream<AudioFrame>): AsyncIterable<TranscriptChunk> {
    const reader = audio.getReader();
    let buffer: Float32Array[] = [];
    const SAMPLES_PER_CHUNK = 24000; // 1 second of audio at 24kHz

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer.push(value.data);

        const totalSamples = buffer.reduce((sum, b) => sum + b.length, 0);
        if (totalSamples >= SAMPLES_PER_CHUNK) {
          const merged = this.mergeBuffers(buffer);
          buffer = [];

          const result = await this.invoke('whisperkit_transcribe_stream', {
            audioData: Array.from(merged),
            sampleRate: value.sampleRate,
            language: this.language,
            model: this.modelPath,
          }) as { text: string; isFinal: boolean; confidence: number };

          yield {
            text: result.text,
            isFinal: result.isFinal,
            confidence: result.confidence,
          };
        }
      }

      // Flush remaining buffer
      if (buffer.length > 0) {
        const merged = this.mergeBuffers(buffer);
        const result = await this.invoke('whisperkit_transcribe_stream', {
          audioData: Array.from(merged),
          sampleRate: 24000,
          language: this.language,
          model: this.modelPath,
          flush: true,
        }) as { text: string; isFinal: boolean; confidence: number };

        yield { text: result.text, isFinal: true, confidence: result.confidence };
      }
    } finally {
      reader.releaseLock();
    }
  }

  getLanguage(): string {
    return this.language;
  }

  setLanguage(lang: string): void {
    this.language = lang;
    this.logger.info('Language changed', { language: lang });
  }

  private mergeBuffers(buffers: Float32Array[]): Float32Array {
    const total = buffers.reduce((sum, b) => sum + b.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const buf of buffers) {
      merged.set(buf, offset);
      offset += buf.length;
    }
    return merged;
  }
}
