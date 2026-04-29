# src/tests/unit/vad-processor.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VADProcessor, VADState, DEFAULT_VAD_CONFIG } from '@application/services/audio/vad-processor';

describe('VADProcessor', () => {
  let vad: VADProcessor;

  beforeEach(() => {
    vad = new VADProcessor();
  });

  it('should start in SILENCE state', () => {
    expect(vad.getState()).toBe(VADState.SILENCE);
  });

  it('should detect speech when energy exceeds threshold', () => {
    const events: Array<{ state: VADState; confidence: number }> = [];
    vad.onEvent((event) => events.push(event));

    // Create a frame with high energy (speech-like)
    const speechFrame = new Float32Array(480);
    for (let i = 0; i < speechFrame.length; i++) {
      speechFrame[i] = Math.sin(i * 0.1) * 0.5; // High amplitude sine wave
    }

    // Process multiple speech frames to trigger SPEECH state
    for (let i = 0; i < 20; i++) {
      vad.processFrame(speechFrame, i * 20);
    }

    expect(events.some(e => e.state === VADState.SPEECH)).toBe(true);
  });

  it('should not trigger speech on silence', () => {
    const events: Array<{ state: VADState }> = [];
    vad.onEvent((event) => events.push(event));

    // Create a frame with low energy (silence)
    const silenceFrame = new Float32Array(480);
    for (let i = 0; i < silenceFrame.length; i++) {
      silenceFrame[i] = (Math.random() - 0.5) * 0.001; // Very low amplitude noise
    }

    // Process many silence frames
    for (let i = 0; i < 100; i++) {
      vad.processFrame(silenceFrame, i * 20);
    }

    expect(events.some(e => e.state === VADState.SPEECH)).toBe(false);
    expect(vad.getState()).toBe(VADState.SILENCE);
  });

  it('should detect end of speech after silence period', () => {
    const events: Array<{ state: VADState; audioSegment?: Float32Array }> = [];
    vad.onEvent((event) => events.push(event));

    // Speech frames
    const speechFrame = new Float32Array(480);
    for (let i = 0; i < speechFrame.length; i++) {
      speechFrame[i] = Math.sin(i * 0.1) * 0.5;
    }

    // Silence frames
    const silenceFrame = new Float32Array(480);
    for (let i = 0; i < silenceFrame.length; i++) {
      silenceFrame[i] = (Math.random() - 0.5) * 0.001;
    }

    // Start speech
    for (let i = 0; i < 30; i++) {
      vad.processFrame(speechFrame, i * 20);
    }

    // Then silence for >500ms
    for (let i = 30; i < 60; i++) {
      vad.processFrame(silenceFrame, i * 20);
    }

    const endOfSpeech = events.find(e => e.state === VADState.END_OF_SPEECH);
    expect(endOfSpeech).toBeDefined();
    expect(endOfSpeech?.audioSegment).toBeDefined();
    expect(endOfSpeech!.audioSegment!.length).toBeGreaterThan(0);
  });

  it('should reset state correctly', () => {
    const speechFrame = new Float32Array(480);
    for (let i = 0; i < speechFrame.length; i++) {
      speechFrame[i] = Math.sin(i * 0.1) * 0.5;
    }

    // Trigger speech
    for (let i = 0; i < 20; i++) {
      vad.processFrame(speechFrame, i * 20);
    }

    expect(vad.getState()).toBe(VADState.SPEECH);

    vad.reset();
    expect(vad.getState()).toBe(VADState.SILENCE);
  });

  it('should use custom config', () => {
    const customVad = new VADProcessor({
      energyThreshold: 0.1, // Higher threshold
      minSpeechDurationMs: 500,
      minSilenceDurationMs: 1000,
    });

    expect(customVad.getState()).toBe(VADState.SILENCE);
  });

  it('should maintain pre-speech buffer', () => {
    const events: Array<{ state: VADState; audioSegment?: Float32Array }> = [];
    vad.onEvent((event) => events.push(event));

    // Some silence frames first
    const silenceFrame = new Float32Array(480);
    for (let i = 0; i < silenceFrame.length; i++) {
      silenceFrame[i] = (Math.random() - 0.5) * 0.001;
    }

    for (let i = 0; i < 10; i++) {
      vad.processFrame(silenceFrame, i * 20);
    }

    // Then speech
    const speechFrame = new Float32Array(480);
    for (let i = 0; i < speechFrame.length; i++) {
      speechFrame[i] = Math.sin(i * 0.1) * 0.5;
    }

    for (let i = 10; i < 40; i++) {
      vad.processFrame(speechFrame, i * 20);
    }

    // Then silence to trigger end
    for (let i = 40; i < 70; i++) {
      vad.processFrame(silenceFrame, i * 20);
    }

    const endOfSpeech = events.find(e => e.state === VADState.END_OF_SPEECH);
    expect(endOfSpeech).toBeDefined();
    // Audio segment should include pre-speech buffer
    expect(endOfSpeech!.audioSegment!.length).toBeGreaterThan(480 * 20); // At least 20 frames
  });
});
