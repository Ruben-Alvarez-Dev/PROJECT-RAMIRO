// src/application/use-cases/knowledge/index-document.ts

import type { IKnowledgePort } from '@core/ports/input/knowledge.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { Document, IndexResult } from '@core/domain/types';
import { TierLevel } from '@core/domain/enums';

export interface IndexDocumentInput {
  readonly title: string;
  readonly content: string;
  readonly source: string;
  readonly tier: TierLevel;
  readonly metadata?: Record<string, unknown>;
}

export class IndexDocument {
  constructor(
    private readonly knowledge: IKnowledgePort,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: IndexDocumentInput): Promise<IndexResult> {
    const doc: Document = {
      id: crypto.randomUUID(),
      title: input.title,
      content: input.content,
      source: input.source,
      tier: input.tier,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.knowledge.indexDocument(doc);

    this.eventBus.emit({
      type: 'knowledge.document.indexed',
      payload: { documentId: result.documentId, tier: input.tier, chunks: result.chunksCount },
      timestamp: new Date(),
    });

    return result;
  }
}
