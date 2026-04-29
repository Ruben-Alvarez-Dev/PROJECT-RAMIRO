# Technology Stack

---

## Runtime & Language

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| Core + Application | TypeScript | 5.x | Type safety, ecosystem, team familiarity |
| Infrastructure | TypeScript + Rust (Tauri) | 5.x / 1.x | Performance-critical adapters in Rust |
| Native macOS | Swift | 5.10+ | Audio/video hardware access, WhisperKit |
| Native Android | Kotlin | 2.x | Android platform adapters |
| MCP Backend | Python | 3.12+ | FastMCP ecosystem, ML libraries |

## Desktop Shell

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Shell | Tauri v2 | Cross-platform (macOS + Windows + Android), Rust performance, small binary |
| UI Framework | React 19 | Concurrent features, Server Components ready |
| State Management | Zustand | Lightweight, TypeScript-first, no boilerplate |
| Styling | SCSS Modules + BEM | Scoped styles, maintainable, no runtime cost |
| Build | Vite 6 | Fast HMR, ESM-native, Tauri integration |

## Audio Pipeline

| Component | Primary | Fallback | Notes |
|-----------|---------|----------|-------|
| Capture | LiveKit (WebRTC) | Native platform APIs | Low-latency, echo cancellation |
| VAD | Silero VAD (ONNX) | WebRTC VAD | ML-based, high accuracy |
| STT | MiMo V2 Omni (streaming) | Deepgram Nova-2 | Omni handles audio natively |
| STT (offline) | WhisperKit (Swift) | — | Zero latency, runs on Apple Silicon |
| TTS | MiMo V2 TTS | Gemini TTS | Streaming synthesis, <200ms first byte |
| Audio Routing | Web Audio API | CoreAudio (macOS) | Cross-platform audio graph |

## Video Pipeline

| Component | Primary | Fallback | Notes |
|-----------|---------|----------|-------|
| Capture | LiveKit (WebRTC) | Native screen APIs | Up to 4 simultaneous streams |
| Screen Share | LiveKit Screen Share | macOS CGDisplay | Window + monitor selection |
| Frame Processing | Canvas API + WebAssembly | GPU compute | Compositing, annotation |
| OBS Integration | obs-websocket v5 | — | Stream composition, scene switching |
| Video Encoding | VP8/VP9 (WebRTC) | H.264 | Hardware accelerated where available |

## LLM Providers

| Provider | Models | Use Case | Auth |
|----------|--------|----------|------|
| Xiaomi MiMo | V2 Omni, V2.5 Pro, V2 TTS | Primary multimodal + reasoning + TTS | `tp-*` token plan keys |
| Alibaba Qwen | Qwen2.5-Omni | Fallback multimodal | API key |
| Anthropic | Claude Sonnet 4, Claude 3.5 Haiku | Deep reasoning, code analysis | API key |
| OpenAI | GPT-4o, Whisper | Fallback STT, vision | API key |
| Google | Gemini 2.5 Flash | Fast inference, fallback TTS | API key |
| OpenRouter | Various | Model routing, experimentation | API key |
| Z.AI | GLM-4 series | Cost-effective bulk processing | API key |

## Knowledge & Memory

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Vector Store | Qdrant | Self-hosted, fast, MCP-compatible |
| Session Storage | SQLite (via Tauri) | Embedded, zero-config, cross-platform |
| Long-term Memory | SQLite + Qdrant | Structured + semantic search |
| Document Index | Custom (Python FastMCP) | MCP-realtime-tech-docs integration |
| Context Management | Custom tokenizer | tiktoken + auto-summarization |

## MCP Integration

| MCP Server | Purpose | Status |
|------------|---------|--------|
| realtime-tech-docs | Qwen, MiMo, LiveKit documentation | ✅ Active |
| desktop-commander | System automation | ✅ Active |
| goose-memory | Persistent memory | ✅ Active |
| ramiro-knowledge | Oposition materials, TIER 0 docs | 📋 Planned |

## CI/CD & Infrastructure

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| CI/CD | GitHub Actions | Free for public repos, matrix builds |
| Hosting (model relay) | Hetzner (via Caroline) | Cost-effective European VPS |
| Package Registry | npm (packages), PyPI (MCP) | Standard distribution |
| Code Quality | Biome (JS), SwiftLint, Ruff (Python) | Fast, modern linters |
| Testing | Vitest (unit), Playwright (E2E) | Fast, Tauri-compatible |

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cold start | <3s | Time to interactive |
| Audio latency (e2e) | <200ms | Mic → Speaker |
| Video frame processing | <100ms | Capture → Model input |
| Memory idle | <500MB | Application footprint |
| Memory active | <2GB | With 4 video streams + LLM |
| CPU idle | <5% | Background |
| CPU active | <40% | Full pipeline |
| Session duration | >2h | No memory leaks, stable |
