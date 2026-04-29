// src/infrastructure/config/adapter-factory.ts

import type { IAudioInputPort } from '@core/ports/input/audio-input.port';
import type { IVideoInputPort } from '@core/ports/input/video-input.port';
import type { ILLMPort } from '@core/ports/output/llm.port';
import type { ISTTPort } from '@core/ports/output/stt.port';
import type { ITTSPort } from '@core/ports/output/tts.port';
import type { IVectorPort } from '@core/ports/output/vector.port';
import type { IStoragePort } from '@core/ports/output/storage.port';
import type { IEventBus } from '@core/ports/notification/event-bus.port';
import type { AppConfig } from '@shared/config/app.config';
import { container, SERVICE_KEYS } from '@shared/di/container';
import { LiveKitAudioAdapter } from '../adapters/audio/livekit-audio.adapter';
import { LiveKitVideoAdapter } from '../adapters/video/livekit-video.adapter';
import { QwenAdapter } from '../adapters/llm/qwen/qwen.adapter';
import { OpenAIAdapter } from '../adapters/llm/openai/openai.adapter';
import { DeepgramAdapter } from '../adapters/stt/deepgram.adapter';
import { MiMoTTSAdapter } from '../adapters/tts/mimo-tts.adapter';
import { GeminiTTSAdapter } from '../adapters/tts/gemini-tts.adapter';
import { QdrantAdapter } from '../adapters/knowledge/qdrant.adapter';
import { SQLiteStorageAdapter } from '../adapters/storage/sqlite.adapter';
import { AudioPipelineService } from '@application/services/audio/audio-pipeline.service';
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
  const eventBus = new InMemoryEventBus();
  container.register<IEventBus>(SERVICE_KEYS.EVENT_BUS, eventBus);

  // Audio
  container.register<IAudioInputPort>(SERVICE_KEYS.AUDIO_INPUT, new LiveKitAudioAdapter());

  // Video
  container.register<IVideoInputPort>(SERVICE_KEYS.VIDEO_INPUT, new LiveKitVideoAdapter());

  // LLM Providers
  const xiaomiKey = process.env.XIAOMI_API_KEY ?? '';
  const qwenKey = process.env.QWEN_API_KEY ?? '';
  const openaiKey = process.env.OPENAI_API_KEY ?? '';
  const deepgramKey = process.env.DEEPGRAM_API_KEY ?? '';
  const geminiKey = process.env.GEMINI_API_KEY ?? '';

  // Xiaomi adapter — uses OpenAI-compatible format for LLM
  container.register<ILLMPort>(SERVICE_KEYS.LLM_OMNI, new OpenAIAdapter(xiaomiKey, 'https://token-plan-ams.xiaomimimo.com/v1'));
  container.register<ILLMPort>(SERVICE_KEYS.LLM_PRO, new OpenAIAdapter(xiaomiKey, 'https://token-plan-ams.xiaomimimo.com/v1'));
  container.register<ILLMPort>(SERVICE_KEYS.LLM_FALLBACK, new QwenAdapter(qwenKey));

  // STT — WhisperKit (primary, macOS via Tauri bridge) handled at presentation layer
  // Deepgram as cloud fallback
  container.register<ISTTPort>(SERVICE_KEYS.STT_FALLBACK, new DeepgramAdapter(deepgramKey));

  // TTS
  container.register<ITTSPort>(SERVICE_KEYS.TTS_PRIMARY, new MiMoTTSAdapter(xiaomiKey));
  container.register<ITTSPort>(SERVICE_KEYS.TTS_FALLBACK, new GeminiTTSAdapter(geminiKey));

  // Knowledge
  container.register<IVectorPort>(SERVICE_KEYS.VECTOR, new QdrantAdapter());

  // Storage
  container.register<IStoragePort>(SERVICE_KEYS.STORAGE, new SQLiteStorageAdapter());

  // Audio Pipeline — wired with all dependencies
  const audioInput = container.resolve<IAudioInputPort>(SERVICE_KEYS.AUDIO_INPUT);
  const audioOutput = container.resolve<IAudioOutputPort>(SERVICE_KEYS.AUDIO_OUTPUT);
  const sttPrimary = container.resolve<ISTTPort>(SERVICE_KEYS.STT_PRIMARY);
  const ttsPrimary = container.resolve<ITTSPort>(SERVICE_KEYS.TTS_PRIMARY);
  const llmOmni = container.resolve<ILLMPort>(SERVICE_KEYS.LLM_OMNI);

  container.register(SERVICE_KEYS.AUDIO_PIPELINE, new AudioPipelineService(
    audioInput,
    audioOutput,
    sttPrimary,
    ttsPrimary,
    llmOmni,
    eventBus,
  ));
}
