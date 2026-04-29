// src/presentation/shared/hooks/useAudio.ts
import { useState, useRef, useCallback } from 'react';

interface UseAudioState {
  isCapturing: boolean;
  isPlaying: boolean;
  error: string | null;
  devices: MediaDeviceInfo[];
}

export function useAudio() {
  const [state, setState] = useState<UseAudioState>({
    isCapturing: false,
    isPlaying: false,
    error: null,
    devices: [],
  });

  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(d => d.kind === 'audioinput');
      setState(prev => ({ ...prev, devices: audioDevices }));
      return audioDevices;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enumerate devices';
      setState(prev => ({ ...prev, error: message }));
      return [];
    }
  }, []);

  const startCapture = useCallback(async (deviceId?: string) => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 24000 });
      contextRef.current = ctx;

      setState(prev => ({ ...prev, isCapturing: true, error: null }));
      return stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start capture';
      setState(prev => ({ ...prev, error: message }));
      return null;
    }
  }, []);

  const stopCapture = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    contextRef.current?.close();
    streamRef.current = null;
    contextRef.current = null;
    setState(prev => ({ ...prev, isCapturing: false }));
  }, []);

  return {
    ...state,
    getDevices,
    startCapture,
    stopCapture,
    stream: streamRef.current,
    audioContext: contextRef.current,
  };
}
