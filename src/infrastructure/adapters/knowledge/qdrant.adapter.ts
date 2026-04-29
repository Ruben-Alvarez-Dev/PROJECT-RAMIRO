import type { IVectorPort, Vector, VectorResult } from '@core/ports/output/vector.port';
import { AdapterError } from '@shared/errors/domain.error';
import { Logger } from '@shared/logging/logger';

export class QdrantAdapter implements IVectorPort {
  private readonly logger = new Logger('QdrantAdapter');

  constructor(
    private readonly baseUrl: string = 'http://localhost:6333',
    private readonly apiKey?: string,
  ) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['api-key'] = this.apiKey;
    return h;
  }

  async upsert(collection: string, vectors: Vector[]): Promise<void> {
    const res = await fetch(`${this.baseUrl}/collections/${collection}/points`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ points: vectors.map(v => ({ id: v.id, vector: v.values, payload: v.payload })) }),
    });
    if (!res.ok) throw new AdapterError(`Qdrant upsert failed: ${res.status}`, 'qdrant');
    this.logger.debug('Upserted vectors', { collection, count: vectors.length });
  }

  async search(collection: string, query: number[], limit: number): Promise<VectorResult[]> {
    const res = await fetch(`${this.baseUrl}/collections/${collection}/points/search`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ vector: query, limit, with_payload: true }),
    });
    if (!res.ok) throw new AdapterError(`Qdrant search failed: ${res.status}`, 'qdrant');
    const data = await res.json() as { result: Array<{ id: string; score: number; payload: Record<string, unknown> }> };
    return data.result.map(r => ({ id: r.id, score: r.score, payload: r.payload ?? {} }));
  }

  async delete(collection: string, ids: string[]): Promise<void> {
    const res = await fetch(`${this.baseUrl}/collections/${collection}/points/delete`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ points: ids }),
    });
    if (!res.ok) throw new AdapterError(`Qdrant delete failed: ${res.status}`, 'qdrant');
  }

  async createCollection(name: string, dimension: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/collections/${name}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ vectors: { size: dimension, distance: 'Cosine' } }),
    });
    if (!res.ok) throw new AdapterError(`Qdrant createCollection failed: ${res.status}`, 'qdrant');
    this.logger.info('Collection created', { name, dimension });
  }
}
