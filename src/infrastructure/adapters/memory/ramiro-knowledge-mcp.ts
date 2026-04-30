// src/infrastructure/adapters/memory/ramiro-knowledge-mcp.ts
// MCP tool exposing Ramiro's knowledge base to Goose.
// Tools: search_knowledge, add_memory, recall_memory, get_context_status

import type { MemoryStore, MemoryEntry } from '@application/services/memory/memory-store';
import type { FocusAnchoringService } from '@application/services/knowledge/focus-anchoring.service';
import type { CompactionService } from '@application/services/memory/compaction.service';
import { Logger } from '@shared/logging/logger';

export interface MCPToolResult {
  readonly content: string;
  readonly isError?: boolean;
}

export class RamiroKnowledgeMCP {
  private readonly logger = new Logger('RamiroMCP');

  constructor(
    private readonly memoryStore: MemoryStore,
    private readonly focusService: FocusAnchoringService,
    private readonly compactionService: CompactionService,
  ) {}

  // Tool 1: Search knowledge base
  async searchKnowledge(query: string, maxResults = 5): Promise<MCPToolResult> {
    try {
      const results = await this.memoryStore.search(query);
      const topResults = results.slice(0, maxResults);

      if (topResults.length === 0) {
        return { content: `No knowledge found for: "${query}"` };
      }

      const formatted = topResults.map((r, i) =>
        `[${i + 1}] ${r.name} (${r.type}, confidence: ${r.confidence})\n    ${r.description}\n    ${r.content.slice(0, 300)}`
      ).join('\n\n');

      return { content: `Found ${topResults.length} results:\n\n${formatted}` };
    } catch (error) {
      return { content: `Search error: ${error instanceof Error ? error.message : 'Unknown'}`, isError: true };
    }
  }

  // Tool 2: Add memory
  async addMemory(name: string, description: string, content: string, type: MemoryEntry['type'] = 'user'): Promise<MCPToolResult> {
    try {
      const entry: MemoryEntry = {
        name,
        description,
        type,
        content,
        scope: 'user',
        confidence: 1.0,
        source: 'user',
        created: new Date().toISOString(),
      };

      await this.memoryStore.save(entry);
      this.logger.info('Memory added', { name, type });
      return { content: `Memory saved: "${name}" (${type})` };
    } catch (error) {
      return { content: `Save error: ${error instanceof Error ? error.message : 'Unknown'}`, isError: true };
    }
  }

  // Tool 3: Recall memory (most relevant to query)
  async recallMemory(query: string): Promise<MCPToolResult> {
    try {
      const results = await this.memoryStore.search(query, 'user');
      const recent = results.slice(0, 3);

      if (recent.length === 0) {
        return { content: `No memories recalled for: "${query}"` };
      }

      const formatted = recent.map(r =>
        `[${r.name}] (confidence: ${r.confidence}, last used: ${r.lastUsedAt ?? 'never'})\n${r.content}`
      ).join('\n\n---\n\n');

      return { content: `Recalled ${recent.length} memories:\n\n${formatted}` };
    } catch (error) {
      return { content: `Recall error: ${error instanceof Error ? error.message : 'Unknown'}`, isError: true };
    }
  }

  // Tool 4: Get context status (TIER 0-3 usage)
  async getContextStatus(): Promise<MCPToolResult> {
    const anchor = this.focusService.getCurrentAnchor();
    const index = await this.memoryStore.list();

    const status = [
      `=== Ramiro Context Status ===`,
      `Total memories: ${index.totalEntries}`,
      `Current topic: ${anchor?.subTopic ?? 'none'}`,
      `Topic confidence: ${anchor?.confidence?.toFixed(2) ?? 'n/a'}`,
      `Topic messages: ${anchor?.messageCount ?? 0}`,
      ``,
      `=== Memory Index ===`,
      index.entries.slice(0, 10).map(e => `- ${e.name}: ${e.description}`).join('\n'),
    ].join('\n');

    return { content: status };
  }
}
