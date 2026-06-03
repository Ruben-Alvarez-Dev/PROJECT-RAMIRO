import { CompactionService } from '@application/services/memory/compaction.service';
import type { LLMMessage } from '@core/domain/types';
import type { ILLMPort } from '@core/ports/output/llm.port';
import { beforeEach, describe, expect, it } from 'vitest';

describe('CompactionService', () => {
  const mockLLM: ILLMPort = {
    chat: async function* () {
      yield {
        content: 'Summary of previous conversation about SOLID principles and React architecture.',
      };
    },
    chatMultimodal: async function* () {},
    getAvailableModels: async () => [],
    estimateTokens: (text: string) => Math.ceil(text.length / 3.5),
  };

  let service: CompactionService;

  beforeEach(() => {
    service = new CompactionService(mockLLM, { contextLimit: 1000, snipThresholdRatio: 0.7 });
  });

  it('should not compact when under threshold', async () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];
    const { result } = await service.compact(messages);
    expect(result.didCompact).toBe(false);
    expect(result.didSnip).toBe(false);
  });

  it('should snip old tool results (Layer 1)', async () => {
    // Configure so that Layer 1 snipping alone brings tokens under threshold,
    // i.e. Layer 2 (LLM auto-compact) must NOT trigger. This isolates Layer 1.
    service.updateConfig({ contextLimit: 2500, snipThresholdRatio: 0.7 }); // threshold = 1750 tokens

    const messages: LLMMessage[] = [];
    // 3 old "tool result" messages, all older than preserveLastNTurns (6).
    for (let i = 0; i < 3; i++) {
      messages.push({ role: 'assistant', content: 'A'.repeat(3000) });
    }
    // 6 recent short messages — these fill the preservation window untouched.
    for (let i = 0; i < 6; i++) {
      messages.push({ role: 'user', content: 'question' });
    }

    const { result, messages: compacted } = await service.compact(messages);

    // Only Layer 1 ran.
    expect(result.didSnip).toBe(true);
    expect(result.didCompact).toBe(false);

    // The 3 old long messages were snipped...
    for (let i = 0; i < 3; i++) {
      expect(compacted[i]?.content).toContain('chars snipped');
    }
    // ...and the preserved recent messages are untouched.
    for (let i = 3; i < 9; i++) {
      expect(compacted[i]?.content).toBe('question');
    }
  });

  it('should auto-compact via LLM (Layer 2) when snip is insufficient', async () => {
    // Create messages that will exceed threshold even after snip
    const messages: LLMMessage[] = [];
    for (let i = 0; i < 50; i++) {
      messages.push({ role: 'user', content: 'x'.repeat(200) });
      messages.push({ role: 'assistant', content: 'y'.repeat(200) });
    }

    const { messages: compacted } = await service.compact(messages);

    // Should have summary message + ack + recent
    expect(compacted.length).toBeLessThan(messages.length);
    expect(compacted[0]!.content).toContain('Previous conversation summary');
    expect(compacted[1]!.role).toBe('assistant');
  });

  it('should estimate tokens correctly', () => {
    const messages: LLMMessage[] = [
      { role: 'user', content: 'A'.repeat(350) }, // ~100 tokens
      { role: 'assistant', content: 'B'.repeat(700) }, // ~200 tokens
    ];
    expect(service.estimateTokens(messages)).toBeCloseTo(300, -1);
  });

  it('should return correct threshold', () => {
    expect(service.getThreshold()).toBe(700); // 1000 * 0.70
  });
});
