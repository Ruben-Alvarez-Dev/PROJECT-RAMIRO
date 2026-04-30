import { useState, useCallback, useRef } from 'react';
import type { AudioConfig } from '@core/domain/value-objects/audio-config';
import { DEFAULT_AUDIO_CONFIG } from '@core/domain/value-objects/audio-config';

export interface AudioSource {
  id: string;
  name: string;
  stream: MediaStream;
}

export interface UseAudioReturn {
  isCapturing: boolean;
  sources: AudioSource[];
  error: string | null;
  startCapture: (config?: Partial<AudioConfig>) => Promise<void>;
  stopCapture: () => void;
  getDevices: () => Promise<MediaDeviceInfo[]>;
}

export function useAudio(): UseAudioReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [sources, setSources] = useState<AudioSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCapture = useCallback(async (config?: Partial<AudioConfig>) => {
    try {
      setError(null);
      const audioConfig = { ...DEFAULT_AUDIO_CONFIG, ...config };
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: audioConfig.sampleRate,
          channelCount: audioConfig.channels,
          echoCancellation: audioConfig.echoCancellation,
          noiseSuppression: audioConfig.noiseSuppression,
          autoGainControl: audioConfig.autoGainControl,
        },
      });
      streamRef.current = stream;
      setIsCapturing(true);
      setSources([{ id: 'mic-0', name: 'Microphone', stream }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture audio');
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setSources([]);
  }, []);

  const getDevices = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audioinput');
  }, []);

  return { isCapturing, sources, error, startCapture, stopCapture, getDevices };
}
