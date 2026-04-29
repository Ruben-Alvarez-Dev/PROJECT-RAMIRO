// src/presentation/shared/components/ControlBar/ControlBar.tsx
import React from 'react';
import { Button } from '../Button';
import { AudioWaveform } from '../AudioWaveform';
import type { AudioPipelineState } from '@application/services/audio/audio-pipeline.service';
import './ControlBar.scss';

export interface ControlBarProps {
  pipelineState: AudioPipelineState;
  isSessionActive: boolean;
  latencyMs: number;
  onStartVoice: () => void;
  onStartVideo: () => void;
  onStop: () => void;
  onMicToggle: () => void;
  onModelChange?: (model: string) => void;
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'Ready',
  capturing: 'Listening',
  listening: 'Hearing...',
  processing: 'Thinking...',
  speaking: 'Speaking',
  error: 'Error',
};

export const ControlBar: React.FC<ControlBarProps> = ({
  pipelineState,
  isSessionActive,
  latencyMs,
  onStartVoice,
  onStartVideo,
  onStop,
  onMicToggle,
  onModelChange,
  className = '',
}) => {
  const latencyClass = latencyMs < 200 ? 'good' : latencyMs < 500 ? 'ok' : 'bad';

  return (
    <header className={`ramiro-control-bar ${className}`}>
      <div className="ramiro-control-bar__left">
        <span className="ramiro-control-bar__logo">Ramiro</span>
        <span className="ramiro-control-bar__status" data-state={pipelineState.status}>
          {STATUS_LABELS[pipelineState.status] ?? pipelineState.status}
        </span>
      </div>

      <div className="ramiro-control-bar__center">
        {isSessionActive ? (
          <>
            <button
              className={`ramiro-control-bar__mic-button ramiro-control-bar__mic-button--${pipelineState.status === 'listening' ? 'active' : 'idle'}`}
              onClick={onMicToggle}
              title={pipelineState.status === 'listening' ? 'Stop talking' : 'Start talking'}
            >
              {pipelineState.status === 'listening' ? '🔴' : '🎤'}
            </button>
            <AudioWaveform isActive={pipelineState.status === 'listening' || pipelineState.status === 'speaking'} />
            <Button variant="ghost" size="sm" onClick={onStop}>
              ⏹ Stop
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={onStartVoice}>🎤 Voice</Button>
            <Button variant="secondary" onClick={onStartVideo}>📹 Video</Button>
          </>
        )}
      </div>

      <div className="ramiro-control-bar__right">
        {latencyMs > 0 && (
          <span className={`ramiro-control-bar__latency ramiro-control-bar__latency--${latencyClass}`}>
            {Math.round(latencyMs)}ms
          </span>
        )}
        <select
          className="ramiro-control-bar__model-select"
          onChange={(e) => onModelChange?.(e.target.value)}
        >
          <option value="mimo-v2.5-pro">MiMo V2.5 Pro</option>
          <option value="mimo-v2-omni">MiMo V2 Omni</option>
          <option value="qwen2.5-omni">Qwen 2.5 Omni</option>
          <option value="gpt-4o">GPT-4o</option>
        </select>
      </div>
    </header>
  );
};
