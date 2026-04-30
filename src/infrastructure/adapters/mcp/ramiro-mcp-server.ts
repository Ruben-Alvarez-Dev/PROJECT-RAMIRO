// src/infrastructure/adapters/mcp/ramiro-mcp-server.ts
// MCP server exposing Ramiro's capabilities to Goose.
// 5 tools: ramiro_voice, ramiro_video, ramiro_knowledge, ramiro_memory, ramiro_status

import type { MemoryStore } from '@application/services/memory/memory-store';
import type { FocusAnchoringService } from '@application/services/knowledge/focus-anchoring.service';
import type { CompactionService } from '@application/services/memory/compaction.service';
import type { StagnationMonitor } from '@application/services/audio/stagnation-monitor';
import type { ConflictResolver } from '@application/services/memory/conflict-resolver';
import { Logger } from '@shared/logging/logger';

export interface MCPTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

export interface MCPToolCall {
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  readonly content: Array<{ type: 'text'; text: string }>;
  readonly isError?: boolean;
}

export class RamiroMCPServer {
  private readonly logger = new Logger('RamiroMCP');
  private readonly tools: MCPTool[];

  constructor(
    private readonly memoryStore: MemoryStore,
    private readonly focusService: FocusAnchoringService,
    private readonly compactionService: CompactionService,
    private readonly stagnationMonitor: StagnationMonitor,
    private readonly conflictResolver: ConflictResolver,
  ) {
    this.tools = [
      {
        name: 'ramiro_voice',
        description: 'Start or stop a realtime voice session with Ramiro. Use for study conversations, exam practice, or Q&A.',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['start', 'stop'], description: 'Start or stop the voice session' },
            mode: { type: 'string', enum: ['always-on', 'push-to-talk'], description: 'Microphone mode', default: 'always-on' },
            model_mode: { type: 'string', enum: ['auto', 'omni', 'pro', 'both'], description: 'Model routing mode', default: 'auto' },
            system_prompt: { type: 'string', description: 'Custom system prompt for the session' },
          },
          required: ['action'],
        },
      },
      {
        name: 'ramiro_video',
        description: 'Start or stop a realtime video session with Ramiro. Supports camera, screen, window, and OBS sources (up to 4 simultaneous).',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['start', 'stop'], description: 'Start or stop the video session' },
            sources: { type: 'array', items: { type: 'string', enum: ['camera', 'screen', 'window', 'obs'] }, description: 'Video sources to capture' },
            model_mode: { type: 'string', enum: ['auto', 'omni', 'pro', 'both'], description: 'Model routing mode', default: 'auto' },
            fps: { type: 'number', description: 'Frames per second per source', default: 5 },
          },
          required: ['action'],
        },
      },
      {
        name: 'ramiro_knowledge',
        description: 'Search, add, or manage Ramiro\'s knowledge base. The knowledge base contains the opposition syllabus, study notes, and indexed documents.',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['search', 'add', 'recall', 'status', 'ingest'], description: 'Knowledge action' },
            query: { type: 'string', description: 'Search query or memory content' },
            name: { type: 'string', description: 'Memory name (for add action)' },
            description: { type: 'string', description: 'Memory description (for add action)' },
            content: { type: 'string', description: 'Memory content (for add action)' },
            file_path: { type: 'string', description: 'Path to file for ingestion (for ingest action)' },
          },
          required: ['action'],
        },
      },
      {
        name: 'ramiro_memory',
        description: 'Manage Ramiro\'s persistent memory: save insights, recall past sessions, consolidate learnings. Memory persists between sessions.',
        inputSchema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['save', 'recall', 'consolidate', 'list', 'delete'], description: 'Memory action' },
            query: { type: 'string', description: 'Search query (for recall)' },
            name: { type: 'string', description: 'Memory name (for save/delete)' },
            content: { type: 'string', description: 'Memory content (for save)' },
            category: { type: 'string', description: 'Memory category', default: 'study' },
          },
          required: ['action'],
        },
      },
      {
        name: 'ramiro_status',
        description: 'Get Ramiro\'s current status: active session info, pipeline state, context usage, stagnation state, topic focus, and model routing.',
        inputSchema: {
          type: 'object',
          properties: {
            detail: { type: 'string', enum: ['summary', 'full'], description: 'Level of detail', default: 'summary' },
          },
        },
      },
    ];
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  async handleToolCall(call: MCPToolCall): Promise<MCPToolResult> {
    try {
      switch (call.name) {
        case 'ramiro_voice':
          return this.handleVoice(call.arguments);
        case 'ramiro_video':
          return this.handleVideo(call.arguments);
        case 'ramiro_knowledge':
          return this.handleKnowledge(call.arguments);
        case 'ramiro_memory':
          return this.handleMemory(call.arguments);
        case 'ramiro_status':
          return this.handleStatus(call.arguments);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${call.name}` }], isError: true };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('MCP tool error', { tool: call.name, error: message });
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  }

  private async handleVoice(args: Record<string, unknown>): Promise<MCPToolResult> {
    const action = args.action as string;
    const mode = (args.mode as string) ?? 'always-on';
    const modelMode = (args.model_mode as string) ?? 'auto';

    if (action === 'start') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'voice_session_started',
            mode,
            model_mode: modelMode,
            message: `Voice session started in ${mode} mode with ${modelMode} model routing. Use the web UI or Tauri app for the actual audio interface.`,
          }),
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ status: 'voice_session_stopped', message: 'Voice session stopped.' }),
      }],
    };
  }

  private async handleVideo(args: Record<string, unknown>): Promise<MCPToolResult> {
    const action = args.action as string;
    const sources = (args.sources as string[]) ?? ['camera'];
    const modelMode = (args.model_mode as string) ?? 'auto';
    const fps = (args.fps as number) ?? 5;

    if (action === 'start') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'video_session_started',
            sources,
            model_mode: modelMode,
            fps,
            message: `Video session started with ${sources.length} source(s): ${sources.join(', ')}. ${modelMode} model mode at ${fps}fps.`,
          }),
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ status: 'video_session_stopped', message: 'Video session stopped.' }),
      }],
    };
  }

  private async handleKnowledge(args: Record<string, unknown>): Promise<MCPToolResult> {
    const action = args.action as string;

    switch (action) {
      case 'search': {
        const query = (args.query as string) ?? '';
        const results = await this.memoryStore.search(query);
        const top5 = results.slice(0, 5).map((r, i) => `[${i + 1}] ${r.name}: ${r.description}\n${r.content.slice(0, 200)}`);
        return { content: [{ type: 'text', text: top5.length > 0 ? top5.join('\n\n') : `No results for: "${query}"` }] };
      }
      case 'add': {
        await this.memoryStore.save({
          name: (args.name as string) ?? 'unnamed',
          description: (args.description as string) ?? '',
          content: (args.content as string) ?? '',
          type: 'user',
          scope: 'user',
          confidence: 1.0,
          source: 'user',
          created: new Date().toISOString(),
        });
        return { content: [{ type: 'text', text: `Knowledge saved: ${args.name}` }] };
      }
      case 'recall': {
        const query = (args.query as string) ?? '';
        const results = await this.memoryStore.search(query);
        return { content: [{ type: 'text', text: results.slice(0, 3).map(r => r.content).join('\n\n---\n\n') || 'Nothing recalled.' }] };
      }
      case 'status': {
        const index = await this.memoryStore.list();
        const anchor = this.focusService.getCurrentAnchor();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total_memories: index.totalEntries,
              current_topic: anchor?.subTopic ?? 'none',
              topic_confidence: anchor?.confidence ?? 0,
              topic_messages: anchor?.messageCount ?? 0,
            }),
          }],
        };
      }
      default:
        return { content: [{ type: 'text', text: `Unknown knowledge action: ${action}` }], isError: true };
    }
  }

  private async handleMemory(args: Record<string, unknown>): Promise<MCPToolResult> {
    const action = args.action as string;

    switch (action) {
      case 'save': {
        await this.memoryStore.save({
          name: (args.name as string) ?? `memory-${Date.now()}`,
          description: (args.content as string)?.slice(0, 100) ?? '',
          content: (args.content as string) ?? '',
          type: 'user',
          scope: 'user',
          confidence: 1.0,
          source: 'user',
          created: new Date().toISOString(),
        });
        return { content: [{ type: 'text', text: `Memory saved: ${args.name}` }] };
      }
      case 'recall': {
        const results = await this.memoryStore.search((args.query as string) ?? '');
        return { content: [{ type: 'text', text: results.slice(0, 3).map(r => `[${r.name}] ${r.content}`).join('\n\n') || 'No memories recalled.' }] };
      }
      case 'list': {
        const index = await this.memoryStore.list();
        return { content: [{ type: 'text', text: `${index.totalEntries} memories:\n${index.entries.map(e => `- ${e.name}: ${e.description}`).join('\n')}` }] };
      }
      case 'delete': {
        const deleted = await this.memoryStore.delete((args.name as string) ?? '');
        return { content: [{ type: 'text', text: deleted ? `Deleted: ${args.name}` : `Not found: ${args.name}` }] };
      }
      default:
        return { content: [{ type: 'text', text: `Unknown memory action: ${action}` }], isError: true };
    }
  }

  private async handleStatus(args: Record<string, unknown>): Promise<MCPToolResult> {
    const detail = (args.detail as string) ?? 'summary';
    const index = await this.memoryStore.list();
    const anchor = this.focusService.getCurrentAnchor();

    const status = {
      version: '1.0.0',
      uptime: process.uptime?.() ?? 0,
      memory_count: index.totalEntries,
      topic: anchor?.subTopic ?? 'none',
      topic_confidence: anchor?.confidence ?? 0,
      stagnation_cache: this.stagnationMonitor.getCacheSize(),
      context_limit: this.compactionService.getContextLimit(),
      context_threshold: this.compactionService.getThreshold(),
    };

    if (detail === 'full') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            ...status,
            memories: index.entries.slice(0, 10),
            topic_keywords: anchor?.keywords ?? [],
            topic_history_length: anchor?.messageCount ?? 0,
          }, null, 2),
        }],
      };
    }

    return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
  }
}
