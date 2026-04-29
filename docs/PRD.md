# Project Ramiro — Product Requirements Document

**Version:** 1.0.0  
**Date:** 2026-04-29  
**Status:** Active Development  

---

## 1. Vision Statement

PROJECT-RAMIRO is a unified multimodal AI agent platform that enables realtime audio/video conversations grounded in extensive document knowledge. It supports multi-source streaming (up to 4 video + 4 audio sources), screen sharing, and cross-platform deployment, while maintaining persistent conversational context through intelligent memory management.

## 2. Problem Statement

Current AI agent platforms (Goose, Lobechat, Open WebUI) lack:
- Native realtime audio/video bidirectional communication
- Multi-source simultaneous stream processing
- Long-session stability (>1 hour) with document-grounded conversations
- Cross-platform parity (Web + Desktop + Mobile) with premium UX
- Unified architecture that combines orchestration (Goose), knowledge (MCP), and media (LiveKit)

## 3. Target Users

| Persona | Use Case |
|---------|----------|
| **Developer/Architect** | Code review with screen sharing + voice explanation |
| **Student (Oposiciones)** | Long study sessions with document-grounded voice Q&A |
| **Content Creator** | Multi-camera streaming with AI co-host |
| **Remote Team** | AI-assisted meetings with shared screens |

## 4. Core Features

### 4.1 Realtime Audio Pipeline
- Bidirectional audio: microphone input → STT → LLM → TTS → speaker output
- Voice Activity Detection (VAD) with configurable sensitivity
- Support for 1–4 simultaneous audio sources
- Providers: Xiaomi MiMo V2 TTS, Gemini TTS, Deepgram STT, WhisperKit (native macOS)
- Latency target: <200ms end-to-end

### 4.2 Realtime Video Pipeline
- Support for 1–4 simultaneous video sources
- Source types: camera, screen, window, application capture
- Screen sharing with window/monitor selection
- Simultaneous processing by OMNI + PRO models
- Frame sampling: configurable FPS (1–30) per source
- OBS integration for stream composition

### 4.3 Multi-Model Orchestration
- **OMNI Model** (MiMo V2 Omni / Qwen Omni): Processes video + audio simultaneously, generates multimodal responses
- **PRO Model** (MiMo V2.5 Pro / Claude): Deep reasoning on structured data, document analysis
- Both models process streams in parallel; orchestrator merges responses
- Model routing: configurable per-source or per-task

### 4.4 Knowledge Foundation (TIER System)
- **TIER 0 — Sacred Word**: Immutable reference documents (oposition syllabus, legal texts)
- **TIER 1 — Core Knowledge**: Indexed documentation, curated research
- **TIER 2 — Dynamic Context**: Conversation history, session memory
- **TIER 3 — Ephemeral**: Current message, active stream frames
- Auto-cleanup: context window management with focus anchoring
- MCP integration for knowledge retrieval (realtime-tech-docs MCP, memory MCP)

### 4.5 Memory System
- **Session Memory**: Current conversation context with auto-summarization
- **Long-term Memory**: Persistent across sessions (user preferences, learned patterns)
- **Document Memory**: Indexed knowledge base with semantic search
- Auto-cleanup: progressive summarization when context approaches limits
- Focus anchoring: always preserve conversation thread + TIER 0 references

### 4.6 Cross-Platform UI
- **macOS**: Tauri v2 native app with Swift audio/video adapters
- **Web**: React 19 SPA with PWA capabilities
- **Android**: Tauri v2 Mobile with Kotlin adapters
- Design: premium aesthetic (Perplexity/Gemini Live quality)
- Responsive layout supporting: chat, voice, video, multi-stream views

## 5. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Audio latency | <200ms end-to-end |
| Video frame processing | <100ms per frame |
| Session duration | >2 hours stable |
| Context window utilization | <80% with auto-cleanup |
| Memory footprint | <2GB sustained |
| CPU (idle) | <5% |
| CPU (active streaming) | <40% |
| Startup time | <3 seconds |
| Cross-platform parity | Feature parity ±5% |

## 6. Integration Points

| System | Protocol | Purpose |
|--------|----------|---------|
| Goose | MCP | Orchestration, recipes, profiles |
| LiveKit | WebRTC | Audio/video streaming |
| Xiaomi MiMo | REST/WebSocket | Multimodal LLM + TTS |
| Qwen | WebSocket | Omni model fallback |
| OBS Studio | WebSocket | Stream composition |
| Deepgram | WebSocket | STT fallback |
| HuggingFace | REST | Model hosting |

## 7. Constraints

- Must run on Apple Silicon (M-series) natively
- Must support offline mode for audio processing (WhisperKit)
- Must not exceed $0.50/hour API cost per active session
- Must maintain conversation coherence for >1 hour sessions
- Must handle network interruptions gracefully (reconnect + state recovery)

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Voice conversation naturalness | >4.0/5.0 user rating |
| Multi-source stability | 0 crashes in 1hr session |
| Document Q&A accuracy | >90% on oposition materials |
| Cross-platform feature parity | >95% |
| Community adoption | 100 stars in 3 months |
