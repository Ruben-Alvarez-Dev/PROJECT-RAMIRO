import React from 'react';
import { Button } from '../Button';
import { AudioWaveform } from '../AudioWaveform';
import { ModelSwitch, type ModelMode } from '../ModelSwitch';
import type { AudioPipelineState } from '@application/services/audio/audio-pipeline.service';
import './ControlBar.scss';

export interface ControlBarProps {
  pipelineState: AudioPipelineState;
  isSessionActive: boolean;
  latencyMs: number;
  modelMode: ModelMode;
  onStartVoice: () => void;
  onStartVideo: () => void;
  onStop: () => void;
  onMicToggle: () => void;
  onModelModeChange: (mode: ModelMode) => void;
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
  modelMode,
  onStartVoice,
  onStartVideo,
  onStop,
  onMicToggle,
  onModelModeChange,
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
            <ModelSwitch value={modelMode} onChange={onModelModeChange} />
            <Button variant="ghost" size="sm" onClick={onStop}>
              ⏹ Stop
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={onStartVoice}>🎤 Voice</Button>
            <Button variant="secondary" onClick={onStartVideo}>📹 Video</Button>
            <ModelSwitch value={modelMode} onChange={onModelModeChange} />
          </>
        )}
      </div>

      <div className="ramiro-control-bar__right">
        {latencyMs > 0 && (
          <span className={`ramiro-control-bar__latency ramiro-control-bar__latency--${latencyClass}`}>
            {Math.round(latencyMs)}ms
          </span>
        )}
      </div>
    </header>
  );
};
