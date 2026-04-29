import React from 'react';
import './ContextMeter.scss';

export interface ContextMeterProps {
  currentTokens: number;
  maxTokens: number;
  tier0Tokens?: number;
  tier1Tokens?: number;
  tier2Tokens?: number;
  tier3Tokens?: number;
  className?: string;
}

const THRESHOLDS = {
  safe: 0.60,
  warning: 0.80,
  critical: 0.95,
};

function getStatus(ratio: number): 'safe' | 'warning' | 'critical' {
  if (ratio >= THRESHOLDS.critical) return 'critical';
  if (ratio >= THRESHOLDS.warning) return 'warning';
  return 'safe';
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export const ContextMeter: React.FC<ContextMeterProps> = ({
  currentTokens,
  maxTokens,
  tier0Tokens = 0,
  tier1Tokens = 0,
  tier2Tokens = 0,
  tier3Tokens = 0,
  className = '',
}) => {
  const ratio = currentTokens / maxTokens;
  const percentage = Math.min(100, ratio * 100);
  const status = getStatus(ratio);

  const tier0Pct = (tier0Tokens / maxTokens) * 100;
  const tier1Pct = (tier1Tokens / maxTokens) * 100;
  const tier2Pct = (tier2Tokens / maxTokens) * 100;
  const tier3Pct = (tier3Tokens / maxTokens) * 100;

  return (
    <div className={`ramiro-context-meter ${className}`}>
      <span className="ramiro-context-meter__label">Context</span>
      <div className="ramiro-context-meter__bar">
        <div
          className={`ramiro-context-meter__fill ramiro-context-meter__fill--${status}`}
          style={{ width: `${percentage}%` }}
        />
        <div className="ramiro-context-meter__tier-segments">
          {tier0Pct > 0 && (
            <div
              className="ramiro-context-meter__tier-segment"
              style={{ width: `${tier0Pct}%`, background: 'rgba(253, 203, 110, 0.3)' }}
              title={`TIER 0: ${formatTokens(tier0Tokens)}`}
            />
          )}
          {tier1Pct > 0 && (
            <div
              className="ramiro-context-meter__tier-segment"
              style={{ width: `${tier1Pct}%`, background: 'rgba(108, 92, 231, 0.3)' }}
              title={`TIER 1: ${formatTokens(tier1Tokens)}`}
            />
          )}
          {tier2Pct > 0 && (
            <div
              className="ramiro-context-meter__tier-segment"
              style={{ width: `${tier2Pct}%`, background: 'rgba(0, 206, 201, 0.3)' }}
              title={`TIER 2: ${formatTokens(tier2Tokens)}`}
            />
          )}
          {tier3Pct > 0 && (
            <div
              className="ramiro-context-meter__tier-segment"
              style={{ width: `${tier3Pct}%`, background: 'rgba(90, 90, 120, 0.3)' }}
              title={`TIER 3: ${formatTokens(tier3Tokens)}`}
            />
          )}
        </div>
        <div className="ramiro-context-meter__tooltip">
          T0: {formatTokens(tier0Tokens)} | T1: {formatTokens(tier1Tokens)} | T2: {formatTokens(tier2Tokens)} | T3: {formatTokens(tier3Tokens)}
        </div>
      </div>
      <span className={`ramiro-context-meter__value ramiro-context-meter__value--${status}`}>
        {formatTokens(currentTokens)}/{formatTokens(maxTokens)}
      </span>
    </div>
  );
};
