# Architecture Specification

**Principles:** SOLID · DRY · Clean/Hexagonal Architecture · BEM · Clean Code

---

## 1. Architectural Style: Hexagonal (Ports & Adapters)

```
                    ┌─────────────────────────────────┐
                    │        INFRASTRUCTURE            │
                    │  (Adapters - Outer Ring)         │
                    │                                   │
                    │  ┌──────────┐  ┌──────────┐     │
                    │  │ LiveKit  │  │ MiMo API │     │
                    │  │ Adapter  │  │ Adapter  │     │
                    │  └────┬─────┘  └────┬─────┘     │
                    │       │              │            │
    ┌──────────┐   │  ┌────┴──────────────┴────┐      │
    │PRESENTATION   │  │     APPLICATION        │      │
    │  Tauri UI │◄──┼──│  (Use Cases - Middle)  │      │
    │  Web SPA  │   │  │                        │      │
    │  Android  │   │  │  ┌────────────────┐    │      │
    └──────────┘   │  │  │  CORE (Domain) │    │      │
                    │  │  │  (Inner Ring)  │    │      │
                    │  │  │                │    │      │
                    │  │  │  Entities      │    │      │
                    │  │  │  Value Objects │    │      │
                    │  │  │  Port Interfaces│   │      │
                    │  │  └────────────────┘    │      │
                    │  └────────────────────────┘      │
                    └─────────────────────────────────┘
```

### Dependency Rule
Dependencies point **INWARD** only. Core knows nothing about infrastructure or presentation.

### Layer Responsibilities

| Layer | Responsibility | Examples |
|-------|---------------|----------|
| **Core** | Domain entities, value objects, port interfaces | `Session`, `AudioStream`, `KnowledgeEntry`, `IAudioPort`, `ILLMPort` |
| **Application** | Use cases, orchestration logic | `StartVoiceSession`, `ProcessVideoFrame`, `QueryKnowledge` |
| **Infrastructure** | Port implementations, external APIs | `LiveKitAudioAdapter`, `MiMoLLMAdapter`, `DeepgramSTTAdapter` |
| **Presentation** | UI components, event handling, platform adapters | `ChatView`, `VideoGrid`, `TauriBridge`, `WebViewBridge` |

## 2. Module Map

```
src/
├── core/
│   ├── domain/
│   │   ├── entities/          # Session, Message, StreamSource, KnowledgeEntry
│   │   ├── value-objects/     # AudioConfig, VideoConfig, ModelConfig, TierLevel
│   │   ├── events/            # DomainEvent, AudioFrameReceived, ResponseGenerated
│   │   └── enums/             # StreamType, ModelRole, Platform, SessionState
│   └── ports/
│       ├── input/             # IAudioInputPort, IVideoInputPort, IKnowledgePort
│       ├── output/            # IAudioOutputPort, ILLMPort, IStoragePort
│       └── notification/      # IEventBus, INotificationPort
│
├── application/
│   ├── use-cases/
│   │   ├── audio/             # StartAudioSession, ProcessAudioFrame, StopAudioSession
│   │   ├── video/             # StartVideoStream, ProcessVideoFrame, SwitchVideoSource
│   │   ├── knowledge/         # IndexDocument, QueryKnowledge, RefreshContext
│   │   ├── session/           # CreateSession, ResumeSession, SummarizeSession
│   │   └── orchestration/     # RouteToModel, MergeResponses, ManageContext
│   ├── services/
│   │   ├── AudioPipelineService
│   │   ├── VideoPipelineService
│   │   ├── KnowledgeService
│   │   ├── MemoryService
│   │   └── OrchestratorService
│   └── dto/                   # Input/Output DTOs for each use case
│
├── infrastructure/
│   ├── adapters/
│   │   ├── audio/
│   │   │   ├── livekit/       # LiveKitAudioAdapter (WebRTC)
│   │   │   ├── whisperkit/    # WhisperKitAdapter (native macOS STT)
│   │   │   └── deepgram/      # DeepgramAdapter (cloud STT fallback)
│   │   ├── video/
│   │   │   ├── livekit/       # LiveKitVideoAdapter
│   │   │   ├── obs/           # OBSWebSocketAdapter
│   │   │   └── screen/        # ScreenCaptureAdapter (per-platform)
│   │   ├── llm/
│   │   │   ├── xiaomi/        # MiMoAdapter (V2 Omni, V2.5 Pro, TTS)
│   │   │   ├── qwen/          # QwenAdapter (Omni fallback)
│   │   │   ├── openai/        # OpenAIAdapter (GPT-4o, Whisper)
│   │   │   └── anthropic/     # AnthropicAdapter (Claude)
│   │   ├── knowledge/
│   │   │   ├── mcp/           # MCPKnowledgeAdapter
│   │   │   ├── vector/        # QdrantAdapter
│   │   │   └── file/          # FileKnowledgeAdapter
│   │   └── storage/
│   │       ├── sqlite/        # SQLiteAdapter (sessions, memory)
│   │       └── filesystem/    # FileSystemAdapter (documents)
│   └── config/
│       ├── AppConfig
│       ├── ModelRegistry
│       └── AdapterFactory
│
├── presentation/
│   ├── shared/
│   │   ├── components/        # Atomic Design: atoms, molecules, organisms
│   │   ├── hooks/             # useAudio, useVideo, useSession, useKnowledge
│   │   ├── styles/            # BEM-based SCSS modules
│   │   └── utils/             # formatters, validators, platform detection
│   ├── tauri/                 # macOS desktop specific
│   │   ├── bridge/            # Tauri IPC bridge
│   │   ├── native/            # Swift audio/video adapters
│   │   └── App.tsx
│   ├── web/                   # Web SPA specific
│   │   ├── pwa/               # Service worker, manifest
│   │   └── App.tsx
│   └── android/               # Android specific
│       ├── bridge/            # Kotlin JNI bridge
│       └── App.tsx
│
└── shared/
    ├── di/                    # Dependency injection container
    ├── logging/               # Structured logging
    ├── errors/                # Domain errors, error boundaries
    ├── testing/               # Test utilities, mocks, fixtures
    └── constants/             # Global constants
```

## 3. SOLID Application

| Principle | Application |
|-----------|-------------|
| **S** — Single Responsibility | Each use case does ONE thing. Each adapter wraps ONE external service. |
| **O** — Open/Closed | New LLM providers = new adapter, zero changes to core. New platforms = new presentation layer. |
| **L** — Liskov Substitution | All adapters implement port interfaces. `MiMoAdapter` and `QwenAdapter` are interchangeable via `ILLMPort`. |
| **I** — Interface Segregation | Separate ports for audio input, audio output, video input, LLM, storage. No god-interfaces. |
| **D** — Dependency Inversion | Application depends on port interfaces, not concrete adapters. DI container wires everything at startup. |

## 4. DRY Application

| Concern | Implementation |
|---------|---------------|
| Stream processing | Shared `StreamProcessor<T>` generic for audio and video frame handling |
| Model routing | Single `ModelRouter` service, all use cases delegate routing |
| Error handling | Domain error hierarchy with shared `ErrorBoundary` components |
| Configuration | Single `AppConfig` with environment-based overrides |
| Platform abstraction | Shared React components, platform-specific adapters only in infrastructure |

## 5. Data Flow — Voice Session Example

```
User speaks
    │
    ▼
[Microphone Adapter] ──► [Audio Input Port]
    │
    ▼
[AudioPipelineService]
    ├── [VAD Processor] ──► detect speech segments
    ├── [STT Adapter] ──► transcript text
    │
    ▼
[OrchestratorService]
    ├── [ContextManager] ──► assemble prompt (TIER 0 + TIER 1 + TIER 2 + current)
    ├── [ModelRouter] ──► select model(s) based on task
    │
    ▼
[LLM Adapter(s)] ──► generate response (text + intent)
    │
    ▼
[ResponseMerger]
    ├── [TTS Adapter] ──► audio synthesis
    ├── [Action Executor] ──► tool calls, MCP invocations
    │
    ▼
[Audio Output Port] ──► [Speaker Adapter]
[Memory Service] ──► persist to session + long-term
```

## 6. Data Flow — Multi-Source Video Session Example

```
[Camera 1] [Camera 2] [Screen 1] [Window 1]
    │          │          │          │
    ▼          ▼          ▼          ▼
[VideoInputPort] ← up to 4 simultaneous sources
    │
    ▼
[VideoPipelineService]
    ├── [FrameSampler] ──► configurable FPS per source
    ├── [FrameCompositor] ──► optional OBS-style composition
    │
    ▼
[OrchestratorService]
    ├── OMNI Model ──► processes ALL frames simultaneously (multimodal)
    ├── PRO Model  ──► deep analysis on selected frames
    │
    ▼
[ResponseMerger]
    ├── TTS output (realtime, during stream)
    ├── Text overlay (optional)
    │
    ▼
[Audio Output + Session Memory]
```
