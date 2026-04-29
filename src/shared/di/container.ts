// src/shared/di/container.ts

/**
 * Simple dependency injection container.
 * Follows Dependency Inversion Principle — application layer depends on
 * port interfaces, not concrete adapters. Container wires everything at startup.
 */
export class DIContainer {
  private readonly services = new Map<string, unknown>();
  private readonly factories = new Map<string, () => unknown>();

  register<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  registerFactory<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  resolve<T>(key: string): T {
    // Check singleton instances first
    const instance = this.services.get(key);
    if (instance) return instance as T;

    // Check factories (lazy instantiation)
    const factory = this.factories.get(key);
    if (factory) {
      const created = factory() as T;
      this.services.set(key, created); // cache as singleton
      return created;
    }

    throw new Error(`Service not registered: ${key}`);
  }

  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

// Singleton container instance
export const container = new DIContainer();

// Service keys
export const SERVICE_KEYS = {
  // Ports — Input
  AUDIO_INPUT: 'IAudioInputPort',
  VIDEO_INPUT: 'IVideoInputPort',
  KNOWLEDGE: 'IKnowledgePort',

  // Ports — Output
  AUDIO_OUTPUT: 'IAudioOutputPort',
  LLM_OMNI: 'ILLMPort.omni',
  LLM_PRO: 'ILLMPort.pro',
  LLM_FALLBACK: 'ILLMPort.fallback',
  STT: 'ISTTPort',
  TTS: 'ITTSPort',
  STORAGE: 'IStoragePort',
  VECTOR: 'IVectorPort',

  // Ports — Notification
  EVENT_BUS: 'IEventBus',

  // Application Services
  ORCHESTRATOR: 'OrchestratorService',
  CONTEXT_MANAGER: 'ContextManager',
  MEMORY_SERVICE: 'MemoryService',

  // Use Cases
  START_AUDIO_SESSION: 'StartAudioSession',
  STOP_AUDIO_SESSION: 'StopAudioSession',
  START_VIDEO_STREAM: 'StartVideoStream',
  STOP_VIDEO_STREAM: 'StopVideoStream',
  QUERY_KNOWLEDGE: 'QueryKnowledge',
  INDEX_DOCUMENT: 'IndexDocument',
} as const;
