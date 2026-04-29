# Entity Definitions

---

## Session

```typescript
enum SessionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVING = 'archiving',
  ARCHIVED = 'archived',
}

interface Session {
  readonly id: string;
  state: SessionState;
  type: SessionType;            // voice | video | study | chat
  sources: StreamSource[];
  modelConfig: ModelConfig;
  knowledgeConfig: KnowledgeConfig;
  messages: Message[];
  memory: MemoryEntry[];
  metadata: SessionMetadata;
  createdAt: Date;
  updatedAt: Date;
}
```

## Message

```typescript
enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

interface Message {
  readonly id: string;
  role: MessageRole;
  content: string;
  audio?: AudioBuffer;
  images?: ImageBuffer[];
  sources?: KnowledgeReference[];
  model: string;                  // which model generated this
  tier: TierLevel;                // which TIER context was used
  tokenCount: number;
  metadata: MessageMetadata;
  createdAt: Date;
}
```

## StreamSource

```typescript
enum StreamType {
  AUDIO_INPUT = 'audio_input',
  AUDIO_OUTPUT = 'audio_output',
  VIDEO_CAMERA = 'video_camera',
  VIDEO_SCREEN = 'video_screen',
  VIDEO_WINDOW = 'video_window',
  VIDEO_APP = 'video_app',
}

interface StreamSource {
  readonly id: string;
  type: StreamType;
  name: string;
  config: AudioConfig | VideoConfig;
  status: StreamStatus;          // idle | active | error | reconnecting
  handle?: StreamHandle;
  priority: number;              // 1-4, for frame sampling priority
}
```

## KnowledgeEntry

```typescript
enum TierLevel {
  SACRED = 0,      // TIER 0 — Palabra Santa
  CORE = 1,        // TIER 1 — Indexed knowledge
  DYNAMIC = 2,     // TIER 2 — Session context
  EPHEMERAL = 3,   // TIER 3 — Current turn only
}

interface KnowledgeEntry {
  readonly id: string;
  tier: TierLevel;
  title: string;
  content: string;
  chunk?: string;                // for indexed chunks
  embedding?: number[];          // vector representation
  source: string;                // original file/URL
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

## Value Objects

```typescript
interface AudioConfig {
  sampleRate: number;            // 16000 | 24000 | 48000
  channels: number;              // 1 (mono) | 2 (stereo)
  bitDepth: number;              // 16 | 24 | 32
  codec: 'pcm' | 'opus' | 'aac';
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

interface VideoConfig {
  width: number;
  height: number;
  fps: number;                   // 1-30
  codec: 'vp8' | 'vp9' | 'h264';
  maxBitrate: number;            // kbps
  facing: 'user' | 'environment';
}

interface ModelConfig {
  omni: ModelProvider;           // primary multimodal
  pro: ModelProvider;            // deep reasoning
  tts: ModelProvider;            // text-to-speech
  stt: ModelProvider;            // speech-to-text
  fallback: ModelProvider;       // general fallback
}

interface ModelProvider {
  provider: string;              // xiaomi | qwen | openai | anthropic | google
  model: string;                 // model identifier
  temperature: number;
  maxTokens: number;
  endpoint?: string;             // custom endpoint
}

interface KnowledgeConfig {
  tier0Paths: string[];          // TIER 0 document paths
  tier1Collections: string[];    // Qdrant collection names
  maxContextTokens: number;
  autoSummarize: boolean;
  focusAnchoring: boolean;
}
```
