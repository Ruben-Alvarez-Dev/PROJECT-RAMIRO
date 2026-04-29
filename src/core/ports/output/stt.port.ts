// src/core/ports/output/stt.port.ts

import type { AudioBuffer, AudioFrame, Transcript, TranscriptChunk } from '../../domain/types';

export interface ISTTPort {
  transcribe(audio: AudioBuffer): Promise<Transcript>;
  transcribeStream(audio: ReadableStream<AudioFrame>): AsyncIterable<TranscriptChunk>;
  getLanguage(): string;
}
