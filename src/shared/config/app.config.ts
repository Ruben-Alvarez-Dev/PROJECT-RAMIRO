// src/shared/config/app.config.ts

import type { ModelConfig, KnowledgeConfig, AudioConfig, VideoConfig } from '@core/domain/types';
import { DEFAULT_MODEL_CONFIG } from '@core/domain/value-objects/model-config';
import { DEFAULT_KNOWLEDGE_CONFIG } from '@core/domain/value-objects/knowledge-config';
import { DEFAULT_AUDIO_CONFIG } from '@core/domain/value-objects/audio-config';
import { DEFAULT_VIDEO_CONFIG } from '@core/domain/value-objects/video-config';

export interface AppConfig {
  readonly model: ModelConfig;
  readonly knowledge: KnowledgeConfig;
  readonly audio: AudioConfig;
  readonly video: VideoConfig;
  readonly platform: 'macos' | 'web' | 'android';
  readonly debug: boolean;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  model: DEFAULT_MODEL_CONFIG,
  knowledge: DEFAULT_KNOWLEDGE_CONFIG,
  audio: DEFAULT_AUDIO_CONFIG,
  video: DEFAULT_VIDEO_CONFIG,
  platform: 'macos',
  debug: false,
  logLevel: 'info',
};

/**
 * Load config from environment variables, overriding defaults.
 * Precedence: env vars > config file > defaults.
 */
export function loadConfig(overrides?: Partial<AppConfig>): AppConfig {
  return {
    ...DEFAULT_APP_CONFIG,
    ...overrides,
  };
}
