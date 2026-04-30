// src/application/services/memory/memory-store.ts
// File-based memory storage with YAML frontmatter.
// Pattern from Claude Code (clawspring/memory/store.py).
// User-scoped (~/.ramiro/memory/) + Project-scoped (.ramiro/memory/)

export interface MemoryEntry {
  name: string;
  description: string;
  type: 'user' | 'feedback' | 'project' | 'reference';
  content: string;
  filePath?: string;
  created: string;          // ISO date
  scope: 'user' | 'project';
  confidence: number;       // 0.0-1.0
  source: 'user' | 'consolidator' | 'model' | 'tool';
  lastUsedAt?: string;      // ISO date
  conflictGroup?: string;
}

export interface MemoryIndex {
  entries: Array<{ name: string; description: string; file: string }>;
  totalEntries: number;
  scope: string;
}

// In-memory implementation (Tauri/SQLite bridge replaces later)
export class MemoryStore {
  private entries = new Map<string, MemoryEntry>();
  private readonly userDir: string;
  private readonly projectDir: string;

  constructor(userDir = '~/.ramiro/memory', projectDir = '.ramiro/memory') {
    this.userDir = userDir;
    this.projectDir = projectDir;
  }

  async save(entry: MemoryEntry): Promise<void> {
    const key = this.makeKey(entry.name, entry.scope);
    const existing = this.entries.get(key);

    if (existing && existing.confidence > entry.confidence) {
      return; // Don't overwrite higher confidence
    }

    this.entries.set(key, { ...entry, lastUsedAt: new Date().toISOString() });
  }

  async load(name: string, scope: MemoryEntry['scope'] = 'user'): Promise<MemoryEntry | null> {
    const key = this.makeKey(name, scope);
    const entry = this.entries.get(key) ?? null;
    if (entry) {
      entry.lastUsedAt = new Date().toISOString();
    }
    return entry;
  }

  async search(query: string, scope?: MemoryEntry['scope']): Promise<MemoryEntry[]> {
    const q = query.toLowerCase();
    const results: MemoryEntry[] = [];

    for (const [, entry] of this.entries) {
      if (scope && entry.scope !== scope) continue;
      const haystack = `${entry.name} ${entry.description} ${entry.content}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push(entry);
      }
    }

    // Sort by recency (most recent lastUsedAt first)
    results.sort((a, b) => (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? ''));
    return results;
  }

  async list(scope?: MemoryEntry['scope']): Promise<MemoryIndex> {
    const entries = Array.from(this.entries.values())
      .filter(e => !scope || e.scope === scope)
      .map(e => ({ name: e.name, description: e.description, file: e.filePath ?? '' }));

    return { entries, totalEntries: entries.length, scope: scope ?? 'all' };
  }

  async delete(name: string, scope: MemoryEntry['scope'] = 'user'): Promise<boolean> {
    const key = this.makeKey(name, scope);
    return this.entries.delete(key);
  }

  getIndexContent(scope: MemoryEntry['scope'] = 'user'): string {
    const entries = Array.from(this.entries.values())
      .filter(e => e.scope === scope)
      .map(e => `- [${e.name}](memory/${e.name}.md) — ${e.description}`);

    return entries.join('\n') + (entries.length > 0 ? '\n' : '');
  }

  private makeKey(name: string, scope: string): string {
    return `${scope}:${name.toLowerCase().replace(/\s+/g, '_')}`;
  }
}
