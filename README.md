# PROJECT RAMIRO

> Realtime Autonomous Multimodal Intelligence & Responsive Orchestrator

A unified multimodal AI agent platform supporting realtime audio/video streaming, multi-source ingestion, document-grounded conversations, and cross-platform deployment (Web, macOS, Android).

## Architecture

Hexagonal (Ports & Adapters) with Clean Architecture principles.

```
src/
├── core/           # Domain entities, value objects, ports (interfaces)
├── application/    # Use cases, orchestration, services (AudioPipeline, VAD, ContextManager, Memory)
├── infrastructure/ # Adapters (LiveKit, MiMo TTS, Gemini TTS, Deepgram, Qwen, OpenAI, Qdrant, SQLite)
├── presentation/   # UI layer (Tauri, Web, Android) with BEM + Sentient Void design
└── shared/         # Cross-cutting concerns (logging, config, DI, errors, constants)
```

### Audio Pipeline Flow
```
Mic → LiveKit (WebRTC) → VAD (energy + zero-crossing) → WhisperKit/Deepgram (STT)
    → Context Assembly (TIER 0 sacred + TIER 1 knowledge + TIER 2 history)
    → LLM (MiMo OMNI + PRO parallel) → MiMo TTS / Gemini TTS → Speaker
```

### Video Pipeline Flow
```
1-4 Sources (Camera, Screen, Window, OBS) → LiveKit capture → Canvas frame sampling
    → Parallel processing: MiMo V2 Omni + MiMo V2.5 Pro → Response merge → TTS output
```

### Knowledge TIER System
```
TIER 0 — Sacred Word (Palabra Santa): Immutable, never evicted, always in context
TIER 1 — Core Knowledge: Indexed, semantic search via Qdrant
TIER 2 — Dynamic Context: Session-scoped, auto-summarized at 80% capacity
TIER 3 — Ephemeral: Current turn only, not persisted
```

## Quick Start

```bash
# Clone
git clone https://github.com/Ruben-Alvarez-Dev/PROJECT-RAMIRO.git
cd PROJECT-RAMIRO

# Install dependencies
bun install

# Run dev
bun run dev

# Build
bun run build
```

## Platforms

| Platform | Stack | Status |
|----------|-------|--------|
| macOS Desktop | Tauri v2 + React 19 + Swift Native | 🚧 In Progress |
| Web | React 19 + Vite + PWA | 🚧 In Progress |
| Android | Tauri v2 Mobile + Kotlin adapters | 📋 Planned |

## License

MIT
