// src/application/use-cases/knowledge/query-knowledge.ts

import type { IKnowledgePort } from '@core/ports/input/knowledge.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { SearchResult } from '@core/domain/types';
import { TierLevel } from '@core/domain/enums';

export interface QueryKnowledgeInput {
  readonly query: string;
  readonly tier?: TierLevel;
  readonly limit?: number;
  readonly sessionId?: string;
}

export interface QueryKnowledgeOutput {
  readonly results: SearchResult[];
  readonly totalResults: number;
  readonly queryTimeMs: number;
}

export class QueryKnowledge {
  constructor(
    private readonly knowledge: IKnowledgePort,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: QueryKnowledgeInput): Promise<QueryKnowledgeOutput> {
    const start = Date.now();

    const results = await this.knowledge.search(
      input.query,
      input.tier,
      input.limit ?? 10,
    );

    const queryTimeMs = Date.now() - start;

    this.eventBus.emit({
      type: 'knowledge.query.executed',
      payload: {
        query: input.query,
        tier: input.tier,
        resultCount: results.length,
        queryTimeMs,
        sessionId: input.sessionId,
      },
      timestamp: new Date(),
    });

    return { results, totalResults: results.length, queryTimeMs };
  }
}
