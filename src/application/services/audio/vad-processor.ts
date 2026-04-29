// src/application/services/audio/vad-processor.ts
// Voice Activity Detection using energy-based + zero-crossing heuristics.
// Production: replace with Silero VAD ONNX model for ML-based detection.

export interface VADConfig {
  readonly energyThreshold: number;     // 0.0 - 1.0, default 0.02
  readonly zeroCrossingThreshold: number; // max crossings per frame for speech
  readonly minSpeechDurationMs: number;   // minimum speech segment duration
  readonly minSilenceDurationMs: number;  // minimum silence to trigger end-of-speech
  readonly preSpeechBufferMs: number;     // audio to keep before speech detection
}

export const DEFAULT_VAD_CONFIG: VADConfig = {
  energyThreshold: 0.02,
  zeroCrossingThreshold: 30,
  minSpeechDurationMs: 250,
  minSilenceDurationMs: 500,
  preSpeechBufferMs: 300,
};

export enum VADState {
  SILENCE = 'silence',
  SPEECH = 'speech',
  END_OF_SPEECH = 'end_of_speech',
}

export interface VADEvent {
  state: VADState;
  confidence: number;
  timestamp: number;
  audioSegment?: Float32Array;
}

export class VADProcessor {
  private config: VADConfig;
  private state: VADState = VADState.SILENCE;
  private speechStartTime: number = 0;
  private silenceStartTime: number = 0;
  private preBuffer: Float32Array[] = [];
  private speechBuffer: Float32Array[] = [];
  private readonly callbacks: Set<(event: VADEvent) => void> = new Set();

  constructor(config: Partial<VADConfig> = {}) {
    this.config = { ...DEFAULT_VAD_CONFIG, ...config };
  }

  onEvent(callback: (event: VADEvent) => void): void {
    this.callbacks.add(callback);
  }

  processFrame(frame: Float32Array, timestamp: number): void {
    const energy = this.calculateEnergy(frame);
    const zeroCrossing = this.calculateZeroCrossing(frame);
    const isSpeech = energy > this.config.energyThreshold && zeroCrossing < this.config.zeroCrossingThreshold;
    const confidence = Math.min(1, energy / this.config.energyThreshold);

    // Maintain pre-speech buffer (ring buffer of last N ms)
    this.preBuffer.push(frame);
    const maxPreBufferFrames = Math.ceil(this.config.preSpeechBufferMs / 20); // ~20ms per frame at 50fps
    if (this.preBuffer.length > maxPreBufferFrames) {
      this.preBuffer.shift();
    }

    switch (this.state) {
      case VADState.SILENCE:
        if (isSpeech) {
          this.state = VADState.SPEECH;
          this.speechStartTime = timestamp;
          this.speechBuffer = [...this.preBuffer]; // include pre-speech audio
          this.speechBuffer.push(frame);
          this.emit({ state: VADState.SPEECH, confidence, timestamp });
        }
        break;

      case VADState.SPEECH:
        this.speechBuffer.push(frame);
        if (!isSpeech) {
          if (timestamp - this.speechStartTime > this.config.minSpeechDurationMs) {
            // Enough speech recorded, now tracking silence
            this.silenceStartTime = timestamp;
            this.state = VADState.SILENCE;
            this.emit({
              state: VADState.END_OF_SPEECH,
              confidence,
              timestamp,
              audioSegment: this.mergeBuffers(this.speechBuffer),
            });
            this.speechBuffer = [];
          }
        } else {
          // Reset silence timer if speech continues
          this.silenceStartTime = 0;
        }
        break;
    }
  }

  reset(): void {
    this.state = VADState.SILENCE;
    this.speechBuffer = [];
    this.preBuffer = [];
    this.speechStartTime = 0;
    this.silenceStartTime = 0;
  }

  getState(): VADState {
    return this.state;
  }

  private calculateEnergy(frame: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i]! * frame[i]!;
    }
    return Math.sqrt(sum / frame.length);
  }

  private calculateZeroCrossing(frame: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i]! >= 0) !== (frame[i - 1]! >= 0)) crossings++;
    }
    return crossings;
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

  private emit(event: VADEvent): void {
    for (const cb of this.callbacks) {
      try { cb(event); } catch (e) { console.error('VAD callback error:', e); }
    }
  }
}
