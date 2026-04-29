// src/presentation/shared/components/AudioWaveform/AudioWaveform.tsx
import React, { useRef, useEffect, useState } from 'react';
import './AudioWaveform.scss';

export interface AudioWaveformProps {
  isActive: boolean;
  barCount?: number;
  className?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  barCount = 24,
  className = '',
}) => {
  const [heights, setHeights] = useState<number[]>(Array(barCount).fill(4));
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      setHeights(Array(barCount).fill(4));
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const animate = () => {
      const newHeights = Array.from({ length: barCount }, () => {
        const base = 4;
        const max = 28;
        return base + Math.random() * (max - base);
      });
      setHeights(newHeights);
      animRef.current = requestAnimationFrame(animate);
    };

    // Slower animation (every 120ms)
    const interval = setInterval(() => {
      animRef.current = requestAnimationFrame(animate);
    }, 120);

    return () => {
      clearInterval(interval);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isActive, barCount]);

  return (
    <div className={`ramiro-waveform ${className}`}>
      <div className="ramiro-waveform__bars">
        {heights.map((h, i) => (
          <div
            key={i}
            className={`ramiro-waveform__bar ${isActive ? 'ramiro-waveform__bar--active' : ''}`}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
    </div>
  );
};
