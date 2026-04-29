// src/core/domain/value-objects/knowledge-config.ts

export interface KnowledgeConfig {
  readonly tier0Paths: readonly string[];
  readonly tier1Collections: readonly string[];
  readonly maxContextTokens: number;
  readonly autoSummarize: boolean;
  readonly focusAnchoring: boolean;
}

export const DEFAULT_KNOWLEDGE_CONFIG: KnowledgeConfig = {
  tier0Paths: [],
  tier1Collections: ['default'],
  maxContextTokens: 1_000_000,
  autoSummarize: true,
  focusAnchoring: true,
};
