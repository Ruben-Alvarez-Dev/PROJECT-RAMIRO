# PROJECT RAMIRO

> Realtime Autonomous Multimodal Intelligence & Responsive Orchestrator

A unified multimodal AI agent platform supporting realtime audio/video streaming, multi-source ingestion, document-grounded conversations, and cross-platform deployment (Web, macOS, Android).

## Architecture

Hexagonal (Ports & Adapters) with Clean Architecture principles.

```
src/
├── core/           # Domain entities, value objects, ports (interfaces)
├── application/    # Use cases, orchestration, services
├── infrastructure/ # Adapters (LiveKit, MiMo, Qwen, TTS, etc.)
├── presentation/   # UI layer (Tauri, Web, Android)
└── shared/         # Cross-cutting concerns (logging, config, DI)
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
