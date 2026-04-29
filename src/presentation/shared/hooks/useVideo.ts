// src/presentation/shared/hooks/useVideo.ts
import { useState, useRef, useCallback } from 'react';

interface VideoSource {
  id: string;
  type: 'camera' | 'screen' | 'window';
  name: string;
  stream: MediaStream;
}

interface UseVideoState {
  isStreaming: boolean;
  sources: VideoSource[];
  error: string | null;
}

export function useVideo() {
  const [state, setState] = useState<UseVideoState>({
    isStreaming: false,
    sources: [],
    error: null,
  });

  const sourcesRef = useRef<Map<string, VideoSource>>(new Map());

  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 15 },
        },
      });

      const source: VideoSource = {
        id: `camera-${Date.now()}`,
        type: 'camera',
        name: 'Camera',
        stream,
      };

      sourcesRef.current.set(source.id, source);
      setState(prev => ({
        ...prev,
        isStreaming: true,
        sources: Array.from(sourcesRef.current.values()),
        error: null,
      }));

      return source;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start camera';
      setState(prev => ({ ...prev, error: message }));
      return null;
    }
  }, []);

  const startScreenCapture = useCallback(async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15 },
        },
        audio: false,
      });

      const source: VideoSource = {
        id: `screen-${Date.now()}`,
        type: 'screen',
        name: 'Screen Share',
        stream,
      };

      sourcesRef.current.set(source.id, source);
      setState(prev => ({
        ...prev,
        isStreaming: true,
        sources: Array.from(sourcesRef.current.values()),
        error: null,
      }));

      // Handle user stopping share via browser UI
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        removeSource(source.id);
      });

      return source;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start screen capture';
      setState(prev => ({ ...prev, error: message }));
      return null;
    }
  }, []);

  const removeSource = useCallback((sourceId: string) => {
    const source = sourcesRef.current.get(sourceId);
    if (source) {
      source.stream.getTracks().forEach(t => t.stop());
      sourcesRef.current.delete(sourceId);
      setState(prev => ({
        ...prev,
        sources: Array.from(sourcesRef.current.values()),
        isStreaming: sourcesRef.current.size > 0,
      }));
    }
  }, []);

  const stopAll = useCallback(() => {
    for (const [, source] of sourcesRef.current) {
      source.stream.getTracks().forEach(t => t.stop());
    }
    sourcesRef.current.clear();
    setState(prev => ({ ...prev, isStreaming: false, sources: [] }));
  }, []);

  return {
    ...state,
    startCamera,
    startScreenCapture,
    removeSource,
    stopAll,
  };
}
