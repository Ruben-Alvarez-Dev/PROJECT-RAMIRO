// src/core/ports/output/vector.port.ts

export interface Vector {
  readonly id: string;
  readonly values: number[];
  readonly payload: Record<string, unknown>;
}

export interface VectorResult {
  readonly id: string;
  readonly score: number;
  readonly payload: Record<string, unknown>;
}

export interface IVectorPort {
  upsert(collection: string, vectors: Vector[]): Promise<void>;
  search(collection: string, query: number[], limit: number): Promise<VectorResult[]>;
  delete(collection: string, ids: string[]): Promise<void>;
  createCollection(name: string, dimension: number): Promise<void>;
}
