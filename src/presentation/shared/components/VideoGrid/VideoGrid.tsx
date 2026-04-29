import React, { useCallback, useRef, useEffect } from 'react';
import './VideoGrid.scss';

export interface VideoGridSource {
  id: string;
  name: string;
  type: 'camera' | 'screen' | 'window' | 'app' | 'obs';
  stream: MediaStream;
}

export interface VideoGridProps {
  sources: VideoGridSource[];
  focusedSourceId?: string;
  fps?: number;
  maxSources?: number;
  onSourceClick?: (sourceId: string) => void;
  onSourceRemove?: (sourceId: string) => void;
  onAddSource?: () => void;
  className?: string;
}

const SOURCE_ICONS: Record<string, string> = {
  camera: '📷',
  screen: '🖥️',
  window: '🪟',
  app: '📱',
  obs: '🎬',
};

export const VideoGrid: React.FC<VideoGridProps> = ({
  sources,
  focusedSourceId,
  fps = 5,
  maxSources = 4,
  onSourceClick,
  onSourceRemove,
  onAddSource,
  className = '',
}) => {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    for (const source of sources) {
      const el = videoRefs.current.get(source.id);
      if (el && el.srcObject !== source.stream) {
        el.srcObject = source.stream;
        el.play().catch(() => {});
      }
    }
    // Clean up removed sources
    for (const [id, el] of videoRefs.current) {
      if (!sources.find(s => s.id === id)) {
        el.srcObject = null;
        videoRefs.current.delete(id);
      }
    }
  }, [sources]);

  const setVideoRef = useCallback((id: string, el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(id, el);
    } else {
      videoRefs.current.delete(id);
    }
  }, []);

  if (sources.length === 0) return null;

  return (
    <div
      className={`ramiro-video-grid ${className}`}
      data-sources={Math.min(sources.length, 4)}
    >
      {sources.slice(0, maxSources).map((source) => (
        <div
          key={source.id}
          className={`ramiro-video-grid__cell ${focusedSourceId === source.id ? 'ramiro-video-grid__cell--focused' : ''}`}
          onClick={() => onSourceClick?.(source.id)}
        >
          <video
            ref={(el) => setVideoRef(source.id, el)}
            autoPlay
            muted
            playsInline
          />
          <span className="ramiro-video-grid__fps">{fps}fps</span>
          <span className="ramiro-video-grid__label">
            <span className="ramiro-video-grid__source-type">
              {SOURCE_ICONS[source.type] || '📹'}
            </span>
            {source.name}
          </span>
          {onSourceRemove && (
            <button
              className="ramiro-video-grid__remove"
              onClick={(e) => {
                e.stopPropagation();
                onSourceRemove(source.id);
              }}
              title={`Remove ${source.name}`}
            >
              ✕
            </button>
          )}
          <div className="ramiro-video-grid__overlay">
            <span>Click to focus</span>
          </div>
        </div>
      ))}
      {sources.length < maxSources && onAddSource && (
        <button className="ramiro-video-grid__add" onClick={onAddSource}>
          + Add source ({sources.length}/{maxSources})
        </button>
      )}
    </div>
  );
};
