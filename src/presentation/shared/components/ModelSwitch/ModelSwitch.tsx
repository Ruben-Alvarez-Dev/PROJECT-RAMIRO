import React from 'react';
import './ModelSwitch.scss';

export type ModelMode = 'auto' | 'omni' | 'pro' | 'both';

export interface ModelSwitchProps {
  value: ModelMode;
  onChange: (mode: ModelMode) => void;
  disabled?: boolean;
  className?: string;
}

const MODE_OPTIONS: Array<{ value: ModelMode; label: string; tooltip: string }> = [
  { value: 'auto', label: 'AUTO', tooltip: 'System decides: OMNI for speed, PRO for depth, both for video' },
  { value: 'omni', label: 'OMNI', tooltip: 'Speed mode: realtime visual understanding, low latency' },
  { value: 'pro', label: 'PRO', tooltip: 'Depth mode: structured reasoning, exam-quality answers' },
  { value: 'both', label: 'BOTH', tooltip: 'Parallel: OMNI describes + PRO analyzes simultaneously' },
];

export const ModelSwitch: React.FC<ModelSwitchProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`ramiro-model-switch ${className}`}>
      <span className="ramiro-model-switch__label">Model:</span>
      {MODE_OPTIONS.map((option, index) => (
        <React.Fragment key={option.value}>
          {index > 0 && <div className="ramiro-model-switch__separator" />}
          <button
            className={`ramiro-model-switch__option ${value === option.value ? 'ramiro-model-switch__option--active' : ''}`}
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            title={option.tooltip}
          >
            <span className={`ramiro-model-switch__indicator ramiro-model-switch__indicator--${option.value}`} />
            {option.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
