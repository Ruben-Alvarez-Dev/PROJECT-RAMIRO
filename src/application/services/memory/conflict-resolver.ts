// src/application/services/memory/conflict-resolver.ts
// Handles conflicting memories with conservative approach.
// Rule: When in doubt, quarantine and ask the user (Ruben).

export interface MemoryEntry {
  id: string;
  content: string;
  confidence: number;       // 0.0-1.0
  source: 'user' | 'consolidator' | 'model' | 'tool';
  createdAt: Date;
  updatedAt: Date;
  category: string;
  tags: string[];
  conflictGroup?: string;
}

export interface ConflictResolution {
  action: 'keep_existing' | 'replace' | 'quarantine' | 'ask_user';
  reason: string;
  existingId?: string;
  newId?: string;
}

export class ConflictResolver {
  resolve(existing: MemoryEntry, incoming: MemoryEntry): ConflictResolution {
    // Rule 1: User-stated always wins over model-inferred
    if (existing.source === 'user' && incoming.source !== 'user') {
      return {
        action: 'keep_existing',
        reason: `Existing memory is user-stated (confidence ${existing.confidence}). New is ${incoming.source} (${incoming.confidence}). Keeping user-stated.`,
        existingId: existing.id,
      };
    }

    // Rule 2: Higher confidence wins (significant margin)
    if (existing.confidence > incoming.confidence + 0.1) {
      return {
        action: 'keep_existing',
        reason: `Existing confidence (${existing.confidence}) significantly higher than incoming (${incoming.confidence}).`,
        existingId: existing.id,
      };
    }

    if (incoming.confidence > existing.confidence + 0.1) {
      return {
        action: 'replace',
        reason: `Incoming confidence (${incoming.confidence}) significantly higher than existing (${existing.confidence}).`,
        existingId: existing.id,
        newId: incoming.id,
      };
    }

    // Rule 3: Same confidence → quarantine, ask user
    return {
      action: 'quarantine',
      reason: `Conflicting memories with similar confidence (existing: ${existing.confidence}, incoming: ${incoming.confidence}). Quarantined for user review.`,
      existingId: existing.id,
      newId: incoming.id,
    };
  }

  areConflicting(a: MemoryEntry, b: MemoryEntry): boolean {
    const tagOverlap = a.tags.filter(t => b.tags.includes(t)).length;
    if (a.category !== b.category && tagOverlap === 0) return false;

    const wordsA = new Set(a.content.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(b.content.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const intersection = [...wordsA].filter(w => wordsB.has(w));
    const union = new Set([...wordsA, ...wordsB]);
    const jaccard = union.size > 0 ? intersection.length / union.size : 0;

    return jaccard > 0.6 && jaccard < 0.95;
  }
}
