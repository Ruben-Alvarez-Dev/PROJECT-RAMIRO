# Roadmap

**Last Updated:** 2026-04-29

---

## Phase 0 — Foundation (Week 1)

**Goal:** Project scaffolding, core domain, port interfaces.

| ID | Task | Status | Owner |
|----|------|--------|-------|
| 0.1 | Repository setup, CI, linting, commit hooks | 🔲 | — |
| 0.2 | Core domain entities (Session, Message, StreamSource, KnowledgeEntry) | 🔲 | — |
| 0.3 | Value objects (AudioConfig, VideoConfig, ModelConfig, TierLevel) | 🔲 | — |
| 0.4 | Port interfaces (IAudioPort, IVideoPort, ILLMPort, IStoragePort, IKnowledgePort) | 🔲 | — |
| 0.5 | Domain events (AudioFrameReceived, ResponseGenerated, SessionStateChanged) | 🔲 | — |
| 0.6 | DI container setup | 🔲 | — |
| 0.7 | Shared error hierarchy | 🔲 | — |
| 0.8 | Configuration system (AppConfig, environment overrides) | 🔲 | — |
| 0.9 | Tauri v2 project scaffold (React 19 + Vite 6) | 🔲 | — |
| 0.10 | BEM design system foundation (tokens, variables, reset) | 🔲 | — |

**Deliverable:** Compilable project with empty ports, working CI, design tokens.

---

## Phase 1 — Audio Pipeline (Weeks 2-3)

**Goal:** Working voice conversation end-to-end.

| ID | Task | Status | Owner |
|----|------|--------|-------|
| 1.1 | LiveKit audio adapter (WebRTC capture + playback) | 🔲 | — |
| 1.2 | Silero VAD adapter (ONNX, speech detection) | 🔲 | — |
| 1.3 | MiMo V2 Omni audio streaming adapter | 🔲 | — |
| 1.4 | MiMo V2 TTS adapter (streaming synthesis) | 🔲 | — |
| 1.5 | Deepgram STT fallback adapter | 🔲 | — |
| 1.6 | WhisperKit native macOS STT adapter | 🔲 | — |
| 1.7 | AudioPipelineService (capture → VAD → STT → LLM → TTS → playback) | 🔲 | — |
| 1.8 | OrchestratorService v1 (single model, single source) | 🔲 | — |
| 1.9 | AudioWaveform component (BEM: `.ramiro-waveform`) | 🔲 | — |
| 1.10 | ControlBar component (BEM: `.ramiro-control-bar`) | 🔲 | — |
| 1.11 | StreamIndicator component (BEM: `.ramiro-stream-indicator`) | 🔲 | — |
| 1.12 | VoiceSession page layout (BEM: `.ramiro-page--voice`) | 🔲 | — |
| 1.13 | Audio latency benchmark (<200ms target) | 🔲 | — |

**Deliverable:** Working voice conversation with MiMo Omni. Speak → hear response.

---

## Phase 2 — Video Pipeline (Weeks 4-5)

**Goal:** Multi-source video with simultaneous OMNI + PRO processing.

| ID | Task | Status | Owner |
|----|------|--------|-------|
| 2.1 | LiveKit video adapter (camera capture) | 🔲 | — |
| 2.2 | Screen capture adapter (macOS CGDisplay + window picker) | 🔲 | — |
| 2.3 | Frame sampler (configurable FPS per source) | 🔲 | — |
| 2.4 | Frame compositor (multi-source grid layout) | 🔲 | — |
| 2.5 | OBS WebSocket adapter (scene management) | 🔲 | — |
| 2.6 | OMNI multimodal adapter (video + audio simultaneous input) | 🔲 | — |
| 2.7 | PRO reasoning adapter (structured analysis on selected frames) | 🔲 | — |
| 2.8 | Response merger (OMNI + PRO → unified response) | 🔲 | — |
| 2.9 | VideoPipelineService (up to 4 sources, streaming) | 🔲 | — |
| 2.10 | OrchestratorService v2 (multi-model, multi-source routing) | 🔲 | — |
| 2.11 | VideoGrid component (BEM: `.ramiro-video-grid`, 1-4 cells) | 🔲 | — |
| 2.12 | VideoThumbnail component (BEM: `.ramiro-video-thumb`) | 🔲 | — |
| 2.13 | Source picker (camera/screen/window selection) | 🔲 | — |
| 2.14 | VideoSession page layout (BEM: `.ramiro-page--video`) | 🔲 | — |
| 2.15 | Multi-source stress test (4 video + 4 audio, >1hr stable) | 🔲 | — |

**Deliverable:** 4 video + 4 audio sources processing simultaneously. OMNI + PRO responding via TTS during stream.

---

## Phase 3 — Knowledge Foundation (Weeks 6-7)

**Goal:** Document-grounded conversations with TIER system.

| ID | Task | Status | Owner |
|----|------|--------|-------|
| 3.1 | Qdrant adapter (vector storage + semantic search) | 🔲 | — |
| 3.2 | Document indexer (markdown, PDF, DOCX → chunks → embeddings) | 🔲 | — |
| 3.3 | TIER 0 loader (sacred documents, immutable index) | 🔲 | — |
| 3.4 | TIER 1 ingestion pipeline (MCP servers, file system, web) | 🔲 | — |
| 3.5 | TIER 2 auto-summarization (progressive compression) | 🔲 | — |
| 3.6 | Context assembly algorithm (TIER 0→3 priority) | 🔲 | — |
| 3.7 | Focus anchoring (thread topic + active docs preservation) | 🔲 | — |
| 3.8 | MemoryService (session + long-term + document memory) | 🔲 | — |
| 3.9 | KnowledgeService (index, query, refresh) | 🔲 | — |
| 3.10 | KnowledgePanel component (BEM: `.ramiro-knowledge`) | 🔲 | — |
| 3.11 | SourceCard component (BEM: `.ramiro-source-card`) | 🔲 | — |
| 3.12 | TierBadge component (BEM: `.ramiro-tier-badge`) | 🔲 | — |
| 3.13 | ContextMeter component (BEM: `.ramiro-context-meter`) | 🔲 | — |
| 3.14 | StudySession page layout (BEM: `.ramiro-page--study`) | 🔲 | — |
| 3.15 | 2-hour session stability test (oposition materials) | 🔲 | — |

**Deliverable:** Conversations grounded in TIER 0 documents. Auto-cleanup working. Context never exhausted in 2hr session.

---

## Phase 4 — Memory & MCP Integration (Week 8)

**Goal:** Persistent memory, Goose integration, MCP tools.

| ID | Task | Status | Owner |
|----|------|--------|-------|
| 4.1 | SQLite adapter (sessions, conversation history) | 🔲 | — |
| 4.2 | Session management (create, resume, archive, delete) | 🔲 | — |
| 4.3 | Auto-archiving (session >1h → long-term memory) | 🔲 | — |
| 4.4 | MCP server registration (ramiro-knowledge, ramiro-session) | 🔲 | — |
| 4.5 | Goose recipe: `realtime-voice` | 🔲 | — |
| 4.6 | Goose recipe: `realtime-video` | 🔲 | — |
| 4.7 | Goose recipe: `study-session` | 🔲 | — |
| 4.8 | Goose profile: `ramiro` (multimodal agent) | 🔲 | — |
| 4.9 | MCP-realtime-tech-docs integration test | 🔲 | — |
| 4.10 | Memory recall across sessions | 🔲 | — |

**Deliverable:** Full Goose integration. Persistent memory. MCP tools available.

---

## Phase 5 — Cross-Platform & Polish (Weeks 9-10)

**Goal:** Web + Android deployment, UX polish, performance.

| ID | Task | Status | Owner |
|----|------|--------|-------|
| 5.1 | Web adapter (PWA, WebRTC fallbacks for non-Tauri) | 🔲 | — |
| 5.2 | Responsive layout (768px → 1920px) | 🔲 | — |
| 5.3 | Android Tauri v2 Mobile scaffold | 🔲 | — |
| 5.4 | Kotlin audio/video adapters | 🔲 | — |
| 5.5 | Dashboard page (session history, settings) | 🔲 | — |
| 5.6 | Dark/light theme (data-attribute toggle) | 🔲 | — |
| 5.7 | Animation polish (transitions, micro-interactions) | 🔲 | — |
| 5.8 | Accessibility audit (WCAG 2.1 AA) | 🔲 | — |
| 5.9 | Performance profiling (CPU, memory, latency) | 🔲 | — |
| 5.10 | E2E tests (Playwright for web, XCTest for macOS) | 🔲 | — |
| 5.11 | Documentation site (Docusaurus or similar) | 🔲 | — |
| 5.12 | GitHub release v1.0.0 | 🔲 | — |

**Deliverable:** Production-ready release. Web, macOS, Android.

---

## Phase 6 — Advanced Features (Weeks 11+)

**Goal:** Power user features, extensibility.

| ID | Task | Status | Owner |
|----|------|--------|-------|
| 6.1 | Custom model providers (user-configurable API keys) | 🔲 | — |
| 6.2 | Plugin system (custom adapters via MCP) | 🔲 | — |
| 6.3 | Voice cloning (custom TTS voices) | 🔲 | — |
| 6.4 | Realtime translation (multilingual sessions) | 🔲 | — |
| 6.5 | Meeting mode (multiple human participants + AI) | 🔲 | — |
| 6.6 | Presentation mode (AI co-presenter with slides) | 🔲 | — |
| 6.7 | Export sessions (audio recording, transcript, summary) | 🔲 | — |
| 6.8 | Community hub (share TIER 0 document packs) | 🔲 | — |

**Deliverable:** Feature-complete platform. Community ecosystem.
