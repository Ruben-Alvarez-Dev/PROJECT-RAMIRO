// src/core/domain/value-objects/model-config.ts

export interface ModelProvider {
  readonly provider: string;
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly endpoint?: string;
}

export interface ModelConfig {
  readonly omni: ModelProvider;
  readonly pro: ModelProvider;
  readonly tts: ModelProvider;
  readonly stt: ModelProvider;
  readonly fallback: ModelProvider;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  omni: {
    provider: 'xiaomi',
    model: 'mimo-v2-omni',
    temperature: 0.1,
    maxTokens: 32768,
  },
  pro: {
    provider: 'xiaomi',
    model: 'mimo-v2.5-pro',
    temperature: 0.1,
    maxTokens: 32768,
  },
  tts: {
    provider: 'xiaomi',
    model: 'mimo-v2-tts',
    temperature: 0.1,
    maxTokens: 4096,
  },
  stt: {
    provider: 'xiaomi',
    model: 'mimo-v2-omni',
    temperature: 0.0,
    maxTokens: 4096,
  },
  fallback: {
    provider: 'qwen',
    model: 'qwen2.5-omni',
    temperature: 0.1,
    maxTokens: 32768,
  },
};
