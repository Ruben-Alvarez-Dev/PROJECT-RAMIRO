// src/core/domain/types.ts

import type { SessionState, SessionType, MessageRole, StreamType, StreamStatus, TierLevel, ModelRole, Platform } from './enums';

// ─── Identifiers ───
export type ID = string;

// ─── Audio ───
export interface AudioFrame {
  readonly data: Float32Array;
  readonly sampleRate: number;
  readonly channels: number;
  readonly timestamp: number;
}

export interface AudioBuffer {
  readonly data: Float32Array;
  readonly sampleRate: number;
  readonly channels: number;
  readonly duration: number; // seconds
}

export interface AudioDevice {
  readonly deviceId: string;
  readonly label: string;
  readonly groupId: string;
}

// ─── Video ───
export interface VideoFrame {
  readonly data: ImageData | HTMLCanvasElement | HTMLVideoElement;
  readonly width: number;
  readonly height: number;
  readonly timestamp: number;
  readonly sourceId: string;
}

export interface VideoSource {
  readonly id: string;
  readonly type: StreamType;
  readonly name: string;
  readonly deviceId?: string;
  readonly width?: number;
  readonly height?: number;
}

// ─── Streams ───
export interface StreamHandle {
  readonly id: string;
  readonly type: StreamType;
  readonly status: StreamStatus;
  readonly startedAt: Date;
  readonly metadata?: Record<string, unknown>;
}

// ─── LLM ───
export interface LLMMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
  readonly images?: string[]; // base64 or URLs
}

export interface LLMRequest {
  readonly messages: LLMMessage[];
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly stream?: boolean;
}

export interface LLMChunk {
  readonly content: string;
  readonly finishReason?: 'stop' | 'length' | 'tool_calls';
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
  };
}

export interface MultimodalRequest {
  readonly messages: LLMMessage[];
  readonly audio?: AudioBuffer;
  readonly images?: ImageData[];
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

// ─── Speech ───
export interface Transcript {
  readonly text: string;
  readonly confidence: number;
  readonly language: string;
  readonly duration: number;
}

export interface TranscriptChunk {
  readonly text: string;
  readonly isFinal: boolean;
  readonly confidence: number;
}

export interface VoiceConfig {
  readonly voiceId: string;
  readonly language: string;
  readonly speed?: number;
  readonly pitch?: number;
}

export interface VoiceInfo {
  readonly voiceId: string;
  readonly name: string;
  readonly language: string;
  readonly gender?: 'male' | 'female' | 'neutral';
}

// ─── Knowledge ───
export interface Document {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly source: string;
  readonly tier: TierLevel;
  readonly metadata?: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface IndexResult {
  readonly documentId: string;
  readonly chunksCount: number;
  readonly collectionName: string;
  readonly success: boolean;
  readonly error?: string;
}

export interface SearchResult {
  readonly documentId: string;
  readonly title: string;
  readonly chunk: string;
  readonly score: number;
  readonly tier: TierLevel;
  readonly metadata?: Record<string, unknown>;
}

export interface TierConfig {
  readonly tiers: TierLevel[];
  readonly maxTokensPerTier: Record<TierLevel, number>;
  readonly evictionPolicy: Record<TierLevel, 'none' | 'summarize' | 'drop' | 'archive'>;
}

// ─── Session ───
export interface SessionMetadata {
  readonly userId?: string;
  readonly tags?: string[];
  readonly summary?: string;
  readonly totalTokens?: number;
  readonly totalCost?: number;
}

export interface Session {
  readonly id: ID;
  state: SessionState;
  type: SessionType;
  sources: StreamSource[];
  modelConfig: ModelConfig;
  knowledgeConfig: KnowledgeConfig;
  messages: Message[];
  memory: MemoryEntry[];
  metadata: SessionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  readonly id: ID;
  role: MessageRole;
  content: string;
  audio?: AudioBuffer;
  images?: ImageBuffer[];
  sources?: KnowledgeReference[];
  model: string;
  tier: TierLevel;
  tokenCount: number;
  metadata: MessageMetadata;
  createdAt: Date;
}

export interface ImageBuffer {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly mimeType: string;
}

export interface KnowledgeReference {
  readonly documentId: string;
  readonly title: string;
  readonly tier: TierLevel;
  readonly relevanceScore: number;
  readonly snippet: string;
}

export interface MessageMetadata {
  readonly processingTimeMs?: number;
  readonly modelProvider?: string;
  readonly modelName?: string;
  readonly toolCalls?: ToolCall[];
}

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
  readonly result?: unknown;
}

export interface StreamSource {
  readonly id: ID;
  type: StreamType;
  name: string;
  config: AudioConfig | VideoConfig;
  status: StreamStatus;
  handle?: StreamHandle;
  priority: number;
}

export interface MemoryEntry {
  readonly id: ID;
  readonly content: string;
  readonly category: string;
  readonly tags?: string[];
  readonly embedding?: number[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SessionFilter {
  readonly state?: SessionState;
  readonly type?: SessionType;
  readonly userId?: string;
  readonly tags?: string[];
  readonly limit?: number;
  readonly offset?: number;
}

export interface SessionSummary {
  readonly id: ID;
  readonly state: SessionState;
  readonly type: SessionType;
  readonly messageCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly summary?: string;
}

export interface ModelInfo {
  readonly provider: string;
  readonly model: string;
  readonly displayName: string;
  readonly capabilities: string[];
  readonly contextWindow: number;
}

// Re-export value objects from their modules
export type { AudioConfig } from './value-objects/audio-config';
export type { VideoConfig } from './value-objects/video-config';
export type { ModelConfig, ModelProvider } from './value-objects/model-config';
export type { KnowledgeConfig } from './value-objects/knowledge-config';
