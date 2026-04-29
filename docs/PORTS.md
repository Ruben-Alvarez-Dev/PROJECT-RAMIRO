# Port Interfaces Reference

All ports live in `src/core/ports/`. Infrastructure adapters implement these. Application layer consumes them.

---

## Input Ports (Driving)

### IAudioInputPort
```typescript
interface IAudioInputPort {
  startCapture(config: AudioConfig): Promise<StreamHandle>;
  stopCapture(handle: StreamHandle): Promise<void>;
  onFrame(callback: (frame: AudioFrame) => void): void;
  getAvailableDevices(): Promise<AudioDevice[]>;
  selectDevice(deviceId: string): Promise<void>;
}
```

### IVideoInputPort
```typescript
interface IVideoInputPort {
  startCapture(source: VideoSource): Promise<StreamHandle>;
  stopCapture(handle: StreamHandle): Promise<void>;
  onFrame(callback: (frame: VideoFrame) => void): void;
  getAvailableSources(): Promise<VideoSource[]>;
  setFPS(handle: StreamHandle, fps: number): void;
}
```

### IKnowledgePort
```typescript
interface IKnowledgePort {
  indexDocument(doc: Document): Promise<IndexResult>;
  search(query: string, tier?: TierLevel, limit?: number): Promise<SearchResult[]>;
  getDocument(id: string): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  getTierConfig(): Promise<TierConfig>;
}
```

## Output Ports (Driven)

### IAudioOutputPort
```typescript
interface IAudioOutputPort {
  play(audio: AudioBuffer): Promise<void>;
  stop(): Promise<void>;
  setVolume(level: number): void;
  onPlaybackComplete(callback: () => void): void;
}
```

### ILLMPort
```typescript
interface ILLMPort {
  chat(request: LLMRequest): AsyncIterable<LLMChunk>;
  chatMultimodal(request: MultimodalRequest): AsyncIterable<LLMChunk>;
  getAvailableModels(): Promise<ModelInfo[]>;
  estimateTokens(text: string): number;
}
```

### ISTTPort
```typescript
interface ISTTPort {
  transcribe(audio: AudioBuffer): Promise<Transcript>;
  transcribeStream(audio: ReadableStream<AudioFrame>): AsyncIterable<TranscriptChunk>;
  getLanguage(): string;
}
```

### ITTSPort
```typescript
interface ITTSPort {
  synthesize(text: string, voice?: VoiceConfig): AsyncIterable<AudioBuffer>;
  getAvailableVoices(): Promise<VoiceInfo[]>;
  setVoice(voiceId: string): void;
}
```

### IStoragePort
```typescript
interface IStoragePort {
  saveSession(session: Session): Promise<void>;
  loadSession(id: string): Promise<Session>;
  listSessions(filter?: SessionFilter): Promise<SessionSummary[]>;
  deleteSession(id: string): Promise<void>;
  saveMemory(memory: MemoryEntry): Promise<void>;
  recallMemory(query: string, limit?: number): Promise<MemoryEntry[]>;
}
```

### IVectorPort
```typescript
interface IVectorPort {
  upsert(collection: string, vectors: Vector[]): Promise<void>;
  search(collection: string, query: number[], limit: number): Promise<VectorResult[]>;
  delete(collection: string, ids: string[]): Promise<void>;
  createCollection(name: string, dimension: number): Promise<void>;
}
```

## Notification Ports

### IEventBus
```typescript
interface IEventBus {
  emit(event: DomainEvent): void;
  on(eventType: string, handler: EventHandler): Subscription;
  off(subscription: Subscription): void;
}
```
