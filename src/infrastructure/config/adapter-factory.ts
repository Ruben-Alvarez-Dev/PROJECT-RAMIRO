import type { IAudioInputPort } from '@core/ports/input/audio-input.port';
import type { IVideoInputPort } from '@core/ports/input/video-input.port';
import type { ILLMPort } from '@core/ports/output/llm.port';
import type { IVectorPort } from '@core/ports/output/vector.port';
import type { IStoragePort } from '@core/ports/output/storage.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { AppConfig } from '@shared/config/app.config';
import { container, SERVICE_KEYS } from '@shared/di/container';
import { LiveKitAudioAdapter } from '../adapters/audio/livekit-audio.adapter';
import { LiveKitVideoAdapter } from '../adapters/video/livekit-video.adapter';
import { QwenAdapter } from '../adapters/llm/qwen/qwen.adapter';
import { OpenAIAdapter } from '../adapters/llm/openai/openai.adapter';
import { QdrantAdapter } from '../adapters/knowledge/qdrant.adapter';
import { SQLiteStorageAdapter } from '../adapters/storage/sqlite.adapter';
import type { DomainEvent, EventHandler, Subscription } from '@core/ports/notification/event-bus.port';

class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  emit(event: DomainEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try { handler(event); } catch (e) { console.error('Event handler error:', e); }
      }
    }
  }

  on(eventType: string, handler: EventHandler): Subscription {
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, new Set());
    this.handlers.get(eventType)!.add(handler);
    return { unsubscribe: () => this.handlers.get(eventType)?.delete(handler) };
  }

  off(sub: Subscription): void { sub.unsubscribe(); }
}

/**
 * Wires all adapters into the DI container based on AppConfig.
 * Called once at application startup.
 */
export function initializeAdapters(config: AppConfig): void {
  // Event Bus
  container.register<IEventBus>(SERVICE_KEYS.EVENT_BUS, new InMemoryEventBus());

  // Audio
  container.register<IAudioInputPort>(SERVICE_KEYS.AUDIO_INPUT, new LiveKitAudioAdapter());

  // Video
  container.register<IVideoInputPort>(SERVICE_KEYS.VIDEO_INPUT, new LiveKitVideoAdapter());

  // LLM Providers
  const xiaomiKey = process.env.XIAOMI_API_KEY ?? '';
  const qwenKey = process.env.QWEN_API_KEY ?? '';
  const openaiKey = process.env.OPENAI_API_KEY ?? '';

  // Xiaomi adapter — uses OpenAI-compatible format
  container.register<ILLMPort>(SERVICE_KEYS.LLM_OMNI, new OpenAIAdapter(xiaomiKey, 'https://token-plan-ams.xiaomimimo.com/v1'));
  container.register<ILLMPort>(SERVICE_KEYS.LLM_PRO, new OpenAIAdapter(xiaomiKey, 'https://token-plan-ams.xiaomimimo.com/v1'));
  container.register<ILLMPort>(SERVICE_KEYS.LLM_FALLBACK, new QwenAdapter(qwenKey));

  // Knowledge
  container.register<IVectorPort>(SERVICE_KEYS.VECTOR, new QdrantAdapter());

  // Storage
  container.register<IStoragePort>(SERVICE_KEYS.STORAGE, new SQLiteStorageAdapter());
}
