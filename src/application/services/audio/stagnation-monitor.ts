// src/application/services/audio/stagnation-monitor.ts
// Detects conversation loops and stagnation patterns.
// From Agent-Memory SPEC-v5 adapted for realtime voice/video context.
//
// Triggers:
// 1. Same error 3+ times in a row → truncate history + intervention prompt
// 2. No new information in 5+ turns → prompt topic change
// 3. User repeats same question → provide cached response

export interface StagnationConfig {
  readonly maxSameErrorCount: number;      // default 3
  readonly maxNoProgressTurns: number;     // default 5
  readonly similarityThreshold: number;    // default 0.85 for "same question"
}

export const DEFAULT_STAGNATION_CONFIG: StagnationConfig = {
  maxSameErrorCount: 3,
  maxNoProgressTurns: 5,
  similarityThreshold: 0.85,
};

export interface StagnationResult {
  readonly isStagnant: boolean;
  readonly reason: 'none' | 'same_error' | 'no_progress' | 'repeated_question';
  readonly intervention: string;
  readonly action: 'continue' | 'truncate_history' | 'change_topic' | 'cache_hit';
}

export class StagnationMonitor {
  private errorHistory: string[] = [];
  private turnHistory: Array<{ text: string; hasNewInfo: boolean }> = [];
  private questionCache = new Map<string, string>();
  private config: StagnationConfig;

  constructor(config: Partial<StagnationConfig> = {}) {
    this.config = { ...DEFAULT_STAGNATION_CONFIG, ...config };
  }

  recordTurn(userText: string, assistantText: string, error?: string): StagnationResult {
    // Check for repeated question (cache hit)
    const cached = this.checkQuestionCache(userText);
    if (cached) {
      return {
        isStagnant: true,
        reason: 'repeated_question',
        intervention: `User asked the same question again. Cached response available.`,
        action: 'cache_hit',
      };
    }

    // Record question in cache
    this.questionCache.set(this.normalize(userText), assistantText);

    // Check for same error repeated
    if (error) {
      this.errorHistory.push(error);
      if (this.errorHistory.length > 10) this.errorHistory.shift();

      const sameErrorCount = this.countConsecutiveSame(this.errorHistory);
      if (sameErrorCount >= this.config.maxSameErrorCount) {
        return {
          isStagnant: true,
          reason: 'same_error',
          intervention: `Same error ${sameErrorCount} times. Truncating history and requesting different approach.`,
          action: 'truncate_history',
        };
      }
    } else {
      this.errorHistory = [];
    }

    // Check for no progress
    const hasNewInfo = this.detectNewInformation(userText, assistantText);
    this.turnHistory.push({ text: userText, hasNewInfo });
    if (this.turnHistory.length > 20) this.turnHistory.shift();

    const noProgressCount = this.countConsecutiveNoProgress();
    if (noProgressCount >= this.config.maxNoProgressTurns) {
      return {
        isStagnant: true,
        reason: 'no_progress',
        intervention: `${noProgressCount} turns without new information. Suggesting topic change.`,
        action: 'change_topic',
      };
    }

    return {
      isStagnant: false,
      reason: 'none',
      intervention: '',
      action: 'continue',
    };
  }

  reset(): void {
    this.errorHistory = [];
    this.turnHistory = [];
  }

  getCacheSize(): number {
    return this.questionCache.size;
  }

  clearCache(): void {
    this.questionCache.clear();
  }

  private checkQuestionCache(text: string): string | null {
    const normalized = this.normalize(text);
    return this.questionCache.get(normalized) ?? null;
  }

  private normalize(text: string): string {
    return text.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  }

  private countConsecutiveSame(history: string[]): number {
    if (history.length === 0) return 0;
    const last = history[history.length - 1]!;
    let count = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i] === last) count++;
      else break;
    }
    return count;
  }

  private detectNewInformation(userText: string, assistantText: string): boolean {
    // Simple heuristic: if the user introduces new keywords not seen in last 3 turns
    const recentKeywords = new Set<string>();
    const recent = this.turnHistory.slice(-3);
    for (const turn of recent) {
      const words = turn.text.toLowerCase().split(/\s+/);
      for (const w of words) {
        if (w.length > 4) recentKeywords.add(w);
      }
    }

    const newWords = userText.toLowerCase().split(/\s+/).filter(w => w.length > 4 && !recentKeywords.has(w));
    return newWords.length > 2;
  }

  private countConsecutiveNoProgress(): number {
    let count = 0;
    for (let i = this.turnHistory.length - 1; i >= 0; i--) {
      if (!this.turnHistory[i]!.hasNewInfo) count++;
      else break;
    }
    return count;
  }
}
