// src/application/services/memory/consolidator.ts
// Extract long-term insights from completed sessions.
// Pattern from Claude Code (clawspring/memory/consolidator.py).
// Hard cap: 3 memories per session to avoid noise.

import type { ILLMPort } from '@core/ports/output/llm.port';
import type { LLMMessage } from '@core/domain/types';
import type { MemoryEntry } from './memory-store';
import { Logger } from '@shared/logging/logger';

export interface ConsolidationResult {
  readonly memoriesSaved: number;
  readonly memories: MemoryEntry[];
  readonly skipped: boolean;
  readonly reason?: string;
}

const MIN_MESSAGES_TO_CONSOLIDATE = 8;

const CONSOLIDATION_SYSTEM = `You are a memory consolidation assistant. Analyze the conversation below and extract insights worth storing as persistent memories for future sessions.

Focus ONLY on:
1. New user preferences or working-style corrections revealed in this session
2. Study decisions or facts made explicit (NOT derivable from documents)
3. Behavioral feedback given to the AI (what to do or avoid, and why)

Return a JSON object with key "memories" containing a list of objects, each with:
  "name":        short slug, e.g. "user_struggles_with_constitution_art15"
  "type":        "user" | "feedback" | "project"
  "description": one-line description
  "content":     memory body; lead with the rule/fact then **Why:** and **How to apply:**
  "confidence":  float 0.0-1.0 (use ~0.8 for inferred, ~0.9 for clearly stated)

Return {"memories": []} if nothing new or worth saving.

Do NOT extract:
- Temporary task state or tool results
- Anything obvious from the syllabus structure
- Ephemeral conversation details

Keep to AT MOST 3 memories. Quality over quantity.`;

export class MemoryConsolidator {
  private readonly logger = new Logger('Consolidator');

  constructor(private readonly llm: ILLMPort) {}

  async consolidate(messages: LLMMessage[]): Promise<ConsolidationResult> {
    if (messages.length < MIN_MESSAGES_TO_CONSOLIDATE) {
      return { memoriesSaved: 0, memories: [], skipped: true, reason: 'Too few messages' };
    }

    try {
      // Build condensed transcript from last 40 messages (~20 turns)
      const recent = messages.slice(-40);
      const parts: string[] = [];
      for (const m of recent) {
        const snippet = m.content.slice(0, 600).replace(/\n/g, ' ');
        parts.push(`${m.role === 'user' ? 'User' : 'Assistant'}: ${snippet}`);
      }
      const transcript = parts.join('\n');

      // Call LLM for consolidation
      let resultText = '';
      for await (const chunk of this.llm.chat({
        messages: [
          { role: 'system', content: CONSOLIDATION_SYSTEM },
          { role: 'user', content: `Conversation:\n\n${transcript}` },
        ],
        stream: true,
        temperature: 0.1,
        maxTokens: 1024,
      })) {
        resultText += chunk.content;
      }

      if (!resultText) {
        return { memoriesSaved: 0, memories: [], skipped: true, reason: 'Empty LLM response' };
      }

      // Parse JSON response
      const parsed = JSON.parse(resultText) as { memories: Array<{
        name: string;
        type: string;
        description: string;
        content: string;
        confidence: number;
      }> };

      const memories: MemoryEntry[] = [];
      const now = new Date().toISOString();

      for (const m of (parsed.memories ?? []).slice(0, 3)) { // hard cap: 3
        if (!m.name || !m.type || !m.description || !m.content) continue;

        memories.push({
          name: m.name,
          description: m.description,
          type: (m.type as MemoryEntry['type']) ?? 'user',
          content: m.content,
          scope: 'user',
          confidence: m.confidence ?? 0.8,
          source: 'consolidator',
          created: now,
        });
      }

      this.logger.info('Consolidation complete', { saved: memories.length });

      return { memoriesSaved: memories.length, memories, skipped: false };
    } catch (error) {
      this.logger.error('Consolidation failed', error instanceof Error ? error : new Error(String(error)));
      return { memoriesSaved: 0, memories: [], skipped: true, reason: 'LLM error' };
    }
  }
}
