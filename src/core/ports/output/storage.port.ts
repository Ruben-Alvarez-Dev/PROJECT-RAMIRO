// src/core/ports/output/storage.port.ts

import type { MemoryEntry, Session, SessionFilter, SessionSummary } from '../../domain/types';

export interface IStoragePort {
  saveSession(session: Session): Promise<void>;
  loadSession(id: string): Promise<Session>;
  listSessions(filter?: SessionFilter): Promise<SessionSummary[]>;
  deleteSession(id: string): Promise<void>;
  saveMemory(memory: MemoryEntry): Promise<void>;
  recallMemory(query: string, limit?: number): Promise<MemoryEntry[]>;
}
