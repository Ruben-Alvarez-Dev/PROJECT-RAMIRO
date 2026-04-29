// src/application/services/context-manager.service.ts

import type { KnowledgeConfig, LLMMessage, SearchResult, Message } from '@core/domain/types';
import type { IKnowledgePort } from '@core/ports/input/knowledge.port';
import type { TierLevel } from '@core/domain/enums';

interface ContextBudget {
  tier0: number;
  tier1: number;
  tier2: number;
  tier3: number;
}

/**
 * ContextManager assembles the full prompt context respecting TIER priority.
 * TIER 0 (Sacred) is ALWAYS included. TIER 3 (Ephemeral) fills remaining space.
 */
export class ContextManager {
  constructor(private readonly knowledge: IKnowledgePort) {}

  async assembleContext(
    config: KnowledgeConfig,
    currentMessage: string,
    conversationHistory: Message[],
    windowSize: number,
  ): Promise<string> {
    const budget = this.calculateBudget(windowSize);
    const parts: string[] = [];

    // TIER 0 — Sacred Word (always included)
    const tier0Context = await this.loadTier0(config);
    if (tier0Context) {
      parts.push(`[TIER 0 — Sacred Word]\n${this.truncateToTokens(tier0Context, budget.tier0)}`);
    }

    // TIER 1 — Retrieved knowledge (semantic search)
    const tier1Results = await this.knowledge.search(currentMessage, undefined, 5);
    if (tier1Results.length > 0) {
      const tier1Text = tier1Results
        .map((r: SearchResult) => `[${r.title}] ${r.chunk}`)
        .join('\n\n');
      parts.push(`[TIER 1 — Knowledge]\n${this.truncateToTokens(tier1Text, budget.tier1)}`);
    }

    // TIER 2 — Conversation history (progressive compression)
    const tier2Text = this.compressHistory(conversationHistory, budget.tier2);
    if (tier2Text) {
      parts.push(`[TIER 2 — Conversation]\n${tier2Text}`);
    }

    // TIER 3 — Current message
    parts.push(`[TIER 3 — Current]\n${this.truncateToTokens(currentMessage, budget.tier3)}`);

    return parts.join('\n\n---\n\n');
  }

  private calculateBudget(windowSize: number): ContextBudget {
    return {
      tier0: Math.floor(windowSize * 0.30),  // 30% for sacred docs
      tier1: Math.floor(windowSize * 0.25),  // 25% for retrieved knowledge
      tier2: Math.floor(windowSize * 0.35),  // 35% for conversation
      tier3: Math.floor(windowSize * 0.10),  // 10% for current turn
    };
  }

  private async loadTier0(config: KnowledgeConfig): Promise<string | null> {
    if (config.tier0Paths.length === 0) return null;

    const results = await this.knowledge.search('sacred tier0', 0 as TierLevel, 20);
    return results.map((r: SearchResult) => r.chunk).join('\n\n');
  }

  private compressHistory(history: Message[], budget: number): string {
    if (history.length === 0) return '';

    // Last 10 messages in full detail
    const recent = history.slice(-10);
    const older = history.slice(0, -10);

    let result = '';

    // Older messages: progressive summarization
    if (older.length > 0) {
      const mid = Math.floor(older.length / 2);
      const keyPoints = older.slice(mid).map((m: Message) =>
        `${m.role}: ${m.content.substring(0, 100)}...`
      ).join('\n');
      result += `[Earlier context]\n${keyPoints}\n\n`;
    }

    // Recent messages: full detail
    result += recent.map((m: Message) =>
      `${m.role}: ${m.content}`
    ).join('\n');

    return this.truncateToTokens(result, budget);
  }

  private truncateToTokens(text: string, maxTokens: number): string {
    // Approximate: 1 token ≈ 4 chars for English, ~2 chars for CJK
    const approxChars = maxTokens * 4;
    if (text.length <= approxChars) return text;
    return text.substring(0, approxChars) + '\n[...truncated]';
  }
}
