import { useState, useCallback, useRef } from 'react';
import { StreamType } from '@core/domain/enums';

export interface VideoSource {
  id: string;
  name: string;
  type: 'camera' | 'screen' | 'window' | 'app';
  stream: MediaStream;
}

export interface UseVideoReturn {
  isStreaming: boolean;
  sources: VideoSource[];
  focusedId: string | null;
  error: string | null;
  startCamera: () => Promise<void>;
  startScreen: () => Promise<void>;
  startWindow: () => Promise<void>;
  stopSource: (id: string) => void;
  stopAll: () => void;
  focusSource: (id: string) => void;
}

export function useVideo(): UseVideoReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamsRef = useRef<Map<string, MediaStream>>(new Map());

  const addSource = useCallback((type: VideoSource['type'], stream: MediaStream, name: string) => {
    const id = `${type}-${Date.now()}`;
    streamsRef.current.set(id, stream);
    setSources(prev => [...prev, { id, name, type, stream }]);
    setIsStreaming(true);
    if (!focusedId) setFocusedId(id);
  }, [focusedId]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 15 } },
      });
      addSource('camera', stream, 'Camera');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access denied');
    }
  }, [addSource]);

  const startScreen = useCallback(async () => {
    try {
      setError(null);
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 15 } },
        audio: false,
      });
      addSource('screen', stream, 'Screen');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Screen share denied');
    }
  }, [addSource]);

  const startWindow = useCallback(async () => {
    try {
      setError(null);
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { displaySurface: 'window' } as any,
        audio: false,
      });
      addSource('window', stream, 'Window');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Window capture denied');
    }
  }, [addSource]);

  const stopSource = useCallback((id: string) => {
    const stream = streamsRef.current.get(id);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      streamsRef.current.delete(id);
    }
    setSources(prev => {
      const next = prev.filter(s => s.id !== id);
      if (next.length === 0) setIsStreaming(false);
      return next;
    });
    if (focusedId === id) {
      setFocusedId(sources.find(s => s.id !== id)?.id ?? null);
    }
  }, [focusedId, sources]);

  const stopAll = useCallback(() => {
    for (const [, stream] of streamsRef.current) {
      stream.getTracks().forEach(t => t.stop());
    }
    streamsRef.current.clear();
    setSources([]);
    setIsStreaming(false);
    setFocusedId(null);
  }, []);

  const focusSource = useCallback((id: string) => {
    setFocusedId(id);
  }, []);

  return { isStreaming, sources, focusedId, error, startCamera, startScreen, startWindow, stopSource, stopAll, focusSource };
}
