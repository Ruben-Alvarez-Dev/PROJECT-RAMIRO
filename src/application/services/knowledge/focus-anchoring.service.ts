// src/application/services/knowledge/focus-anchoring.service.ts
// Tracks current conversation topic to boost relevant TIER 1 results.
// When studying "Constitución Española Art. 15", documents about
// that article get higher relevance scores.

import { Logger } from '@shared/logging/logger';

export interface TopicAnchor {
  readonly mainTopic: string;          // e.g. "Constitución Española"
  readonly subTopic: string;           // e.g. "Artículo 15 - Derecho a la vida"
  readonly keywords: readonly string[];
  readonly confidence: number;         // 0.0-1.0
  readonly detectedAt: number;         // timestamp
  readonly messageCount: number;       // how many messages about this topic
}

export interface FocusScore {
  readonly originalScore: number;      // from Qdrant
  readonly boostedScore: number;       // after focus anchoring
  readonly boost: number;              // multiplier applied
  readonly reason: string;
}

export class FocusAnchoringService {
  private readonly logger = new Logger('FocusAnchor');
  private currentAnchor: TopicAnchor | null = null;
  private topicHistory: TopicAnchor[] = [];
  private readonly decayRate = 0.95; // topic relevance decays 5% per turn

  getCurrentAnchor(): TopicAnchor | null {
    return this.currentAnchor;
  }

  updateTopic(userMessage: string): void {
    // Extract topic signals from user message
    const keywords = this.extractKeywords(userMessage);
    if (keywords.length === 0) return;

    if (this.currentAnchor) {
      // Check if same topic (keyword overlap > 50%)
      const overlap = keywords.filter(k => this.currentAnchor!.keywords.includes(k)).length;
      const overlapRatio = overlap / Math.max(keywords.length, this.currentAnchor!.keywords.length);

      if (overlapRatio > 0.5) {
        // Same topic, reinforce
        this.currentAnchor = {
          ...this.currentAnchor,
          keywords: [...new Set([...this.currentAnchor.keywords, ...keywords])],
          confidence: Math.min(1.0, this.currentAnchor.confidence + 0.1),
          messageCount: this.currentAnchor.messageCount + 1,
        };
        return;
      }

      // Different topic, archive old one
      this.topicHistory.push(this.currentAnchor);
      if (this.topicHistory.length > 10) this.topicHistory.shift();
    }

    // New topic anchor
    this.currentAnchor = {
      mainTopic: keywords[0] ?? '',
      subTopic: keywords.slice(0, 3).join(' / '),
      keywords,
      confidence: 0.7,
      detectedAt: Date.now(),
      messageCount: 1,
    };

    this.logger.info('Topic anchor set', { topic: this.currentAnchor.subTopic });
  }

  // Score a search result against the current topic
  scoreResult(originalScore: number, documentText: string): FocusScore {
    if (!this.currentAnchor || this.currentAnchor.confidence < 0.3) {
      return { originalScore, boostedScore: originalScore, boost: 1.0, reason: 'No active topic' };
    }

    const docLower = documentText.toLowerCase();
    const matchCount = this.currentAnchor.keywords.filter(k => docLower.includes(k)).length;
    const matchRatio = matchCount / this.currentAnchor.keywords.length;

    if (matchRatio < 0.1) {
      return { originalScore, boostedScore: originalScore, boost: 1.0, reason: 'No keyword match' };
    }

    // Boost formula: base boost * match ratio * anchor confidence
    const baseBoost = 1.5;
    const boost = 1.0 + (baseBoost - 1.0) * matchRatio * this.currentAnchor.confidence;
    const boostedScore = Math.min(1.0, originalScore * boost);

    return {
      originalScore,
      boostedScore,
      boost: Math.round(boost * 100) / 100,
      reason: `Topic match: ${this.currentAnchor.subTopic} (${Math.round(matchRatio * 100)}% keywords)`,
    };
  }

  // Decay confidence over time (call after each turn)
  decay(): void {
    if (this.currentAnchor) {
      const newConfidence = this.currentAnchor.confidence * this.decayRate;
      if (newConfidence < 0.2) {
        this.logger.info('Topic anchor expired', { topic: this.currentAnchor.subTopic });
        this.currentAnchor = null;
      } else {
        this.currentAnchor = { ...this.currentAnchor, confidence: newConfidence };
      }
    }
  }

  reset(): void {
    this.currentAnchor = null;
    this.topicHistory = [];
  }

  private extractKeywords(text: string): string[] {
    // Extract meaningful words (>4 chars, not stopwords)
    const stopwords = new Set(['como', 'para', 'pero', 'porque', 'esta', 'esto', 'esta', 'como', 'más', 'muy', 'también', 'puede', 'donde', 'cuando', 'desde', 'hasta', 'sobre', 'entre', 'todo', 'todos', 'todas', 'cada', 'otro', 'otra', 'otros', 'otras', 'the', 'and', 'for', 'but', 'not', 'with', 'this', 'that', 'from', 'have', 'been', 'will', 'would', 'could', 'should', 'what', 'when', 'where', 'how', 'why']);
    
    return text.toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4 && !stopwords.has(w))
      .slice(0, 10);
  }
}
