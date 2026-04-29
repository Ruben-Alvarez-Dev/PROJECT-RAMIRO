// src/core/ports/input/knowledge.port.ts

import type { Document, IndexResult, SearchResult, TierConfig } from '../../domain/types';
import type { TierLevel } from '../../domain/enums';

export interface IKnowledgePort {
  indexDocument(doc: Document): Promise<IndexResult>;
  search(query: string, tier?: TierLevel, limit?: number): Promise<SearchResult[]>;
  getDocument(id: string): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  getTierConfig(): Promise<TierConfig>;
}
