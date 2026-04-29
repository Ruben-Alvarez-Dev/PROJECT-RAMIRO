# Roadmap

**Last updated:** 2026-04-29

---

## Phase 0 — Foundation ✅ COMPLETE

| Task | Status | Commit |
|------|--------|--------|
| Git init + .gitignore | ✅ | `3ddb6d5` |
| README.md | ✅ | `0e46d94` |
| PRD | ✅ | `e10fee4` |
| Architecture spec | ✅ | `a4b867d` |
| Tech stack | ✅ | `39bebf6` |
| Knowledge TIER system | ✅ | `352f6bb` |
| Design system (BEM) | ✅ | `cf85231` |
| Git workflow | ✅ | `8c984c9` |
| Testing strategy | ✅ | `0365a55` |
| Port interfaces | ✅ | `8fc00e3` |
| Entity definitions | ✅ | `fc707a7` |
| Tooling (package.json, tsconfig, vite, vitest, biome) | ✅ | `0d0dd63` |
| Domain enums | ✅ | `28e98d8` |
| Value objects | ✅ | `49201b8` |
| Domain types | ✅ | `bda41a9` |
| Port interfaces (code) | ✅ | `20b7ab7` |
| Application use cases + services + DTOs | ✅ | `1ce9134` |
| Shared (DI, errors, logger, config, constants) | ✅ | `6ba9521` |
| Presentation (components, hooks, SCSS, web App) | ✅ | `240638d` |
| Infrastructure adapters + factory | ✅ | `5a4bde9` |
| Unit tests (5 suites) | ✅ | `5a4bde9` |
| GitHub Actions CI | ✅ | `5a4bde9` |

**Total: 22 commits, ~5,900 LOC, complete hexagonal architecture scaffold.**

---

## Phase 1 — Audio Pipeline ✅ COMPLETE

| Task | Status | Commit |
|------|--------|--------|
| WhisperKit STT adapter (Swift native) | ✅ | `33695ae` |
| MiMo V2 TTS adapter (streaming) | ✅ | `33695ae` |
| Deepgram STT adapter (fallback) | ✅ | `33695ae` |
| Gemini TTS adapter (fallback) | ✅ | `33695ae` |
| VAD processor (energy + zero-crossing) | ✅ | `33695ae` |
| Audio pipeline service (full flow) | ✅ | `33695ae` |
| Push-to-talk mode | ✅ | `33695ae` |
| Always-on mode with VAD | ✅ | `33695ae` |
| Audio waveform component | ✅ | `33695ae` |
| ControlBar with pipeline state | ✅ | `33695ae` |
| Unit tests: VAD (7 scenarios) | ✅ | `33695ae` |
| Unit tests: AudioPipeline (8 scenarios) | ✅ | `33695ae` |
| DI wiring for STT/TTS/pipeline | ✅ | `33695ae` |

**Target:** <200ms end-to-end audio latency.

---

## Phase 2 — Video Pipeline

| Task | Priority | Est. LOC |
|------|----------|----------|
| Screen capture adapter (per-platform) | P0 | 300 |
| Window capture adapter | P1 | 200 |
| App capture adapter | P1 | 150 |
| OBS WebSocket v5 integration | P1 | 300 |
| Frame sampler (configurable FPS) | P0 | 150 |
| Multi-source compositor | P0 | 250 |
| OMNI + PRO parallel processor | P0 | 400 |
| Response merger (text + audio) | P0 | 200 |
| Video grid component (1-4 sources) | P0 | 350 |
| Video controls (focus, PIP, reorder) | P1 | 200 |
| Stress test (4 sources, 1hr) | P0 | 200 |

**Target:** 4 simultaneous video sources, no frame drops.

---

## Phase 3 — Knowledge & Memory

| Task | Priority | Est. LOC |
|------|----------|----------|
| Qdrant integration (real, not mock) | P0 | 200 |
| Document indexer (chunking + embedding) | P0 | 300 |
| Semantic search with relevance scoring | P0 | 200 |
| TIER 0 loader (immutable sacred docs) | P0 | 150 |
| TIER 1 auto-index on ingestion | P1 | 200 |
| TIER 2 progressive compression | P0 | 250 |
| Auto-cleanup trigger (80/90/95% thresholds) | P0 | 200 |
| Focus anchoring algorithm | P1 | 150 |
| Session archiving (1hr+ sessions) | P1 | 200 |
| Knowledge sidebar component | P1 | 300 |
| Context meter visualization | P2 | 150 |
| MCP server: ramiro-knowledge | P1 | 400 |
| Long-session test (2hr, no leaks) | P0 | 200 |

**Target:** 2-hour sessions, TIER 0 never evicted, auto-cleanup at 80%.

---

## Phase 4 — Platform & UX

| Task | Priority | Est. LOC |
|------|----------|----------|
| Tauri v2 macOS app shell | P0 | 500 |
| Swift native audio bridge | P0 | 400 |
| Swift native video bridge | P0 | 300 |
| macOS system permissions (mic, camera, screen) | P0 | 200 |
| PWA manifest + service worker | P1 | 300 |
| PWA install prompt | P2 | 100 |
| Android Tauri v2 shell | P2 | 500 |
| Kotlin audio/video adapters | P2 | 400 |
| Network interruption recovery | P1 | 300 |
| Cross-platform feature parity tests | P1 | 200 |

---

## Phase 5 — Integration & Production

| Task | Priority | Est. LOC |
|------|----------|----------|
| Goose MCP tool registration | P0 | 100 |
| Goose recipe: realtime-voice | P0 | 50 |
| Goose recipe: realtime-video | P0 | 50 |
| Goose recipe: study-session | P1 | 50 |
| OBS scene presets | P2 | 200 |
| Caroline deployment (Hetzner relay) | P1 | 300 |
| End-to-end smoke tests | P0 | 300 |
| Performance benchmarks | P0 | 200 |
| Documentation (user guide) | P1 | 500 |
| Documentation (developer guide) | P1 | 400 |
| README polish + badges | P2 | 100 |
| Release v1.0.0 | P0 | — |

---

## Metrics Summary

| Phase | Commits (est.) | LOC (est.) | Status |
|-------|---------------|------------|--------|
| Phase 0 — Foundation | 21 | ~4,200 | ✅ Complete |
| Phase 1 — Audio | ~15 | ~2,200 | 🚧 Next |
| Phase 2 — Video | ~12 | ~2,600 | 📋 Planned |
| Phase 3 — Knowledge | ~13 | ~2,600 | 📋 Planned |
| Phase 4 — Platform | ~10 | ~2,900 | 📋 Planned |
| Phase 5 — Production | ~12 | ~2,250 | 📋 Planned |
| **Total** | **~83** | **~16,750** | |
