// src/application/dto/knowledge.dto.ts

export interface QueryKnowledgeDTO {
  query: string;
  tier?: number;
  limit?: number;
  sessionId?: string;
}

export interface QueryKnowledgeResponseDTO {
  results: Array<{
    documentId: string;
    title: string;
    chunk: string;
    score: number;
    tier: number;
  }>;
  totalResults: number;
  queryTimeMs: number;
}

export interface IndexDocumentDTO {
  title: string;
  content: string;
  source: string;
  tier: number;
  metadata?: Record<string, unknown>;
}

export interface IndexDocumentResponseDTO {
  documentId: string;
  chunksCount: number;
  success: boolean;
  error?: string;
}
