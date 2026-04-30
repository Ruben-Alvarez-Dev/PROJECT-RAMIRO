// src/application/services/memory/compaction.service.ts
// Two-layer context compression from Claude Code pattern.
// Layer 1: Snip old tool results (>6 turns old, keep first half + last quarter)
// Layer 2: Auto-compact when context exceeds 70% (summarize old via LLM)

import type { ILLMPort } from '@core/ports/output/llm.port';
import type { LLMMessage } from '@core/domain/types';
import { Logger } from '@shared/logging/logger';

export interface CompactionConfig {
  readonly contextLimit: number;           // 128000 tokens
  readonly snipThresholdRatio: number;     // 0.70 = trigger at 70%
  readonly keepRatio: number;              // 0.30 = keep 30% recent after compact
  readonly snipMaxChars: number;           // 2000 chars before snipping
  readonly preserveLastNTurns: number;     // 6 turns always preserved
}

export const DEFAULT_COMPACTION_CONFIG: CompactionConfig = {
  contextLimit: 128_000,
  snipThresholdRatio: 0.70,
  keepRatio: 0.30,
  snipMaxChars: 2000,
  preserveLastNTurns: 6,
};

export interface CompactionResult {
  readonly didCompact: boolean;
  readonly didSnip: boolean;
  readonly tokensBefore: number;
  readonly tokensAfter: number;
  readonly messagesRemoved: number;
}

export class CompactionService {
  private readonly logger = new Logger('Compaction');
  private config: CompactionConfig;

  constructor(
    private readonly llm: ILLMPort,
    config: Partial<CompactionConfig> = {},
  ) {
    this.config = { ...DEFAULT_COMPACTION_CONFIG, ...config };
  }

  updateConfig(config: Partial<CompactionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  estimateTokens(messages: LLMMessage[]): number {
    let totalChars = 0;
    for (const m of messages) {
      totalChars += m.content.length;
      // Count image references
      if (m.images) {
        for (const img of m.images) {
          totalChars += img.length;
        }
      }
    }
    return Math.ceil(totalChars / 3.5);
  }

  getContextLimit(): number {
    return this.config.contextLimit;
  }

  getThreshold(): number {
    return Math.floor(this.config.contextLimit * this.config.snipThresholdRatio);
  }

  async compact(messages: LLMMessage[]): Promise<{ messages: LLMMessage[]; result: CompactionResult }> {
    const tokensBefore = this.estimateTokens(messages);
    const threshold = this.getThreshold();

    if (tokensBefore <= threshold) {
      return {
        messages,
        result: { didCompact: false, didSnip: false, tokensBefore, tokensAfter: tokensBefore, messagesRemoved: 0 },
      };
    }

    // Layer 1: Snip old tool results
    const afterSnip = this.snipOldToolResults(messages);
    const tokensAfterSnip = this.estimateTokens(afterSnip);

    if (tokensAfterSnip <= threshold) {
      this.logger.info('Layer 1 snip sufficient', { before: tokensBefore, after: tokensAfterSnip });
      return {
        messages: afterSnip,
        result: { didCompact: false, didSnip: true, tokensBefore, tokensAfter: tokensAfterSnip, messagesRemoved: 0 },
      };
    }

    // Layer 2: Auto-compact via LLM
    const { compacted, removed } = await this.autoCompact(afterSnip);
    const tokensAfter = this.estimateTokens(compacted);

    this.logger.info('Layer 2 compact complete', { before: tokensBefore, after: tokensAfter, removed });

    return {
      messages: compacted,
      result: { didCompact: true, didSnip: true, tokensBefore, tokensAfter, messagesRemoved: removed },
    };
  }

  // Layer 1: Snip tool results older than preserveLastNTurns
  private snipOldToolResults(messages: LLMMessage[]): LLMMessage[] {
    const result = [...messages];
    const cutoff = Math.max(0, result.length - this.config.preserveLastNTurns);

    for (let i = 0; i < cutoff; i++) {
      const m = result[i]!;
      // Snip messages that look like tool results (long content, non-user role)
      if (m.role !== 'user' && m.role !== 'system' && m.content.length > this.config.snipMaxChars) {
        const half = Math.floor(this.config.snipMaxChars / 2);
        const quarter = Math.floor(this.config.snipMaxChars / 4);
        const firstHalf = m.content.slice(0, half);
        const lastQuarter = m.content.slice(-quarter);
        const snipped = m.content.length - half - quarter;
        result[i] = { ...m, content: `${firstHalf}\n[... ${snipped} chars snipped ...]\n${lastQuarter}` };
      }
    }

    return result;
  }

  // Layer 2: Summarize old messages via LLM
  private async autoCompact(messages: LLMMessage[]): Promise<{ compacted: LLMMessage[]; removed: number }> {
    const split = this.findSplitPoint(messages);
    if (split <= 0) return { compacted: messages, removed: 0 };

    const old = messages.slice(0, split);
    const recent = messages.slice(split);

    // Build condensed transcript for summarization
    const parts: string[] = [];
    for (const m of old) {
      const snippet = m.content.slice(0, 500).replace(/\n/g, ' ');
      parts.push(`[${m.role}]: ${snippet}`);
    }
    const transcript = parts.join('\n');

    // Call LLM for summary
    let summary = '';
    for await (const chunk of this.llm.chat({
      messages: [
        { role: 'system', content: 'You are a concise summarizer. Summarize the following conversation history preserving key decisions, file paths, tool results, and context needed to continue. Be brief but complete.' },
        { role: 'user', content: transcript },
      ],
      stream: true,
      temperature: 0.1,
      maxTokens: 1024,
    })) {
      summary += chunk.content;
    }

    const summaryMsg: LLMMessage = {
      role: 'user',
      content: `[Previous conversation summary]\n${summary}`,
    };
    const ackMsg: LLMMessage = {
      role: 'assistant',
      content: 'Understood. I have the context from the previous conversation. Let\'s continue.',
    };

    return {
      compacted: [summaryMsg, ackMsg, ...recent],
      removed: old.length,
    };
  }

  // Walk backwards from end, accumulate tokens until we reach keepRatio
  private findSplitPoint(messages: LLMMessage[]): number {
    const total = this.estimateTokens(messages);
    const target = Math.floor(total * this.config.keepRatio);
    let running = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
      running += this.estimateTokens([messages[i]!]);
      if (running >= target) return i;
    }
    return 0;
  }
}
