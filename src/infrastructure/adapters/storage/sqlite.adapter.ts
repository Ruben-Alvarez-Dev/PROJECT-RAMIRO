import type { IStoragePort } from '@core/ports/output/storage.port';
import type { MemoryEntry, Session, SessionFilter, SessionSummary } from '@core/domain/types';
import { Logger } from '@shared/logging/logger';

/**
 * SQLite storage adapter.
 * Uses Tauri's built-in SQLite or sql.js for web fallback.
 * For now, uses localStorage as placeholder until Tauri integration.
 */
export class SQLiteStorageAdapter implements IStoragePort {
  private readonly logger = new Logger('SQLiteStorage');
  private readonly sessions = new Map<string, Session>();
  private readonly memories = new Map<string, MemoryEntry>();

  async saveSession(session: Session): Promise<void> {
    this.sessions.set(session.id, { ...session, updatedAt: new Date() });
    this.logger.debug('Session saved', { id: session.id });
  }

  async loadSession(id: string): Promise<Session> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    return session;
  }

  async listSessions(filter?: SessionFilter): Promise<SessionSummary[]> {
    let sessions = Array.from(this.sessions.values());
    if (filter?.state) sessions = sessions.filter(s => s.state === filter.state);
    if (filter?.type) sessions = sessions.filter(s => s.type === filter.type);
    if (filter?.limit) sessions = sessions.slice(0, filter.limit);
    return sessions.map(s => ({
      id: s.id,
      state: s.state,
      type: s.type,
      messageCount: s.messages.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      summary: s.metadata.summary,
    }));
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async saveMemory(memory: MemoryEntry): Promise<void> {
    this.memories.set(memory.id, { ...memory, updatedAt: new Date() });
  }

  async recallMemory(query: string, limit: number = 10): Promise<MemoryEntry[]> {
    const results = Array.from(this.memories.values())
      .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
    return results;
  }
}
