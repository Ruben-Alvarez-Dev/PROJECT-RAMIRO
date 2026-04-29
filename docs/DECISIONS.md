# Architecture Decision Records (ADR)

**Last updated:** 2026-04-30

---

## ADR-001: Memory System — Agent-Memory over Claude Code

**Date:** 2026-04-29
**Status:** ACCEPTED
**Context:** We needed to choose between Claude Code's file-based memory (.md + YAML frontmatter) and our Agent-Memory (SQLite + FTS5 + Protocol interfaces).

**Decision:** Use Agent-Memory as primary, with Claude Code's compaction pattern as a complement.

**Rationale:**
- Claude Code's memory is a prompt hack for a chatbot. Agent-Memory is software architecture for an autonomous agent.
- SQLite + FTS5 provides transactional consistency, full-text search, and atomic operations that .md files cannot.
- Agent-Memory has Protocol interfaces (structural subtyping) making it backend-agnostic — swap SQLite for MCP, Qdrant, or any storage without changing domain logic.
- Claude Code's "snip old tool results" (Layer 1) and "auto-compact" (Layer 2) patterns ARE valuable for real-time conversation history management.
- We adopt Claude Code's compaction algorithm but implement it on top of Agent-Memory's storage.

**Consequences:**
- Memory persistence via SQLite + FTS5 (local) or MCP (remote)
- MEMORY.md index file for system prompt injection (from Claude Code)
- Conflict resolution via confidence scoring + quarantine (conservative)
- Consolidation at session end: max 3 memories extracted (from Claude Code)

---

## ADR-002: RAG Engine — Deferred Decision

**Date:** 2026-04-29
**Status:** DEFERRED
**Context:** We need a RAG engine for TIER-06 pipe-rag (document ingestion). The opposition syllabus has hundreds of pages of text, some images, some videos, and long audio conversations.

**Decision:** Defer the RAG engine choice. Proceed with 6 RAG-agnostic FASE 3 tasks NOW.

**Rationale:**
- The compaction service, memory store, consolidator, focus anchoring, MCP tool, and long-session tests are all RAG-agnostic.
- The RAG engine only blocks: document indexer (chunking + embedding), semantic search with Qdrant, and TIER-06 pipe-rag.
- Deferring allows us to evaluate LlamaIndex, R2R, RagFlow, Haystack, and Pathway with actual data before committing.

**Criteria for evaluation:**
- Very long text documents (hundreds of pages)
- Some images (diagrams, charts)
- Some video (occasional)
- Long audio conversations (1-2 hours)
- Must run locally or on single VPS (Hetzner/Caroline)
- Must integrate with Qdrant + Python ecosystem

---

## ADR-003: Context Windows by Model

**Date:** 2026-04-29
**Status:** ACCEPTED
**Context:** We need concrete token limits for budget calculation (TIER 0-3 allocation).

**Decision:**

| Model | Provider | Context Window | Source |
|-------|----------|---------------|--------|
| mimo-v2.5-pro | Xiaomi Token Plan | 128K tokens | Xiaomi API docs |
| mimo-v2-omni | Xiaomi Token Plan | 128K tokens | Xiaomi API docs |
| mimo-v2.5-omni | Xiaomi Token Plan | 128K tokens | Xiaomi API docs |
| qwen2.5-omni | Alibaba Cloud (DashScope) | 128K tokens | Alibaba docs |
| gpt-4o | OpenAI | 128K tokens | OpenAI docs |

**Budget allocation at 128K tokens:**
- TIER 0 (Infrastructure): 38,400 tokens (30%)
- TIER 1 (Knowledge): 32,000 tokens (25%)
- TIER 2 (Conversation): 44,800 tokens (35%)
- TIER 3 (Current turn): 12,800 tokens (10%)

---

## ADR-004: Model Routing — OMNI vs PRO

**Date:** 2026-04-29
**Status:** ACCEPTED
**Context:** MiMo has two model families with different strengths. We need clear routing rules.

**Decision:**

| Scenario | Route | Reason |
|----------|-------|--------|
| Greeting phase | OMNI only | Fast acknowledgement, low latency |
| User requests depth | Both parallel, PRO primary | Deep analysis needed |
| Complex video frames | Both parallel | OMNI describes, PRO analyzes |
| Teaching + video | Both parallel | OMNI describes, PRO explains pedagogically |
| Long session (>30min) + simple frames | OMNI only | Conserve context tokens |
| Audio-only (no video) | PRO only | Text reasoning, no vision needed |
| Default | Both parallel | Comprehensive by default |

**MiMo architecture explanation:**
- OMNI (mimo-v2-omni): Native audio + vision input. Fast, low latency. Frame description, object detection, scene understanding, voice-to-voice.
- PRO (mimo-v2.5-pro): Deep reasoning. Structured analysis. Summarization, comparison, exam-style Q&A, complex explanations.
- Both always run in parallel for video. Orchestrator merges responses.

---

## ADR-005: LiveKit vs getUserMedia

**Date:** 2026-04-29
**Status:** ACCEPTED
**Context:** We have adapters named "LiveKit" but they use browser's getUserMedia directly.

**Decision:** Both coexist. They serve different purposes.

| Technology | Purpose | When |
|-----------|---------|------|
| **getUserMedia** | Direct browser device access (camera, mic) | Always — this is how the browser captures media |
| **LiveKit** | WebRTC SFU (Selective Forwarding Unit) for relay | Remote sessions — when audio/video needs to be relayed through a server (Caroline) |

**How they relate:**
1. getUserMedia captures locally (browser → device)
2. LiveKit relays remotely (browser → LiveKit server → other participants)
3. For local-only sessions (user talking to Ramiro on same machine): getUserMedia is sufficient
4. For remote sessions (user on phone, Ramiro on Caroline): LiveKit provides the relay

**Current state:** Our adapters use getUserMedia for local capture. LiveKit integration is for future remote relay via Caroline (Hetzner VPS).

---

## ADR-006: Session Persistence Architecture

**Date:** 2026-04-29
**Status:** ACCEPTED
**Context:** Ruben said: "todo se guarda en nuestra memoria, a varios niveles diferentes."

**Decision:** Multi-level persistence. Nothing is lost.

| Level | What | Storage | Retention |
|-------|------|---------|-----------|
| **Raw streams** | Complete audio/video recordings | File system (Caroline) | Forever |
| **Episodes** | Complete session transcripts | SQLite + JSONL | Forever |
| **Entities** | People, places, concepts mentioned | Qdrant + SQLite | Forever |
| **Decisions** | Architecture Decision Records | Markdown + Git | Forever |
| **Timeline** | Chronological event log | SQLite | Forever |
| **Conclusions** | End-of-session summaries | MEMORY.md + SQLite | Forever |
| **Learnings** | What Ruben learned (knowledge gaps, strengths) | Memory entries | Forever |
| **Summaries** | Progressive conversation summaries (TIER 2) | SQLite | Compressed over time |

**Session resume:** When Ruben returns the next day, Ramiro loads:
1. Last session summary (from conclusions)
2. Knowledge gaps identified (from learnings)
3. Unfinished topics (from timeline)
4. Raw stream reference (for "where did we leave off?")

---

## ADR-007: Stagnation Detection

**Date:** 2026-04-29
**Status:** ACCEPTED
**Context:** Without stagnation detection, the agent can loop infinitely on the same error or repeat itself.

**Decision:** Implement StagnationMonitor (from Agent-Memory SPEC-v5) with 3 triggers:

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Same error repeated | 3 times | Truncate history + intervention prompt |
| No new information | 5 turns | Suggest topic change |
| Repeated question | Exact match | Return cached response |

**Integration:** StagnationMonitor sits between the AudioPipeline and the LLM. After each turn, it records the user text, assistant response, and any error. If stagnant, it intervenes before the next LLM call.

---

## ADR-008: OBS Integration Status

**Date:** 2026-04-29
**Status:** ACCEPTED
**Context:** Ruben asked about OBS integration status. The OBSVideoAdapter is a skeleton.

**Decision:** OBS integration is a VIDEO SOURCE option, not a requirement.

**What OBS provides that browser APIs don't:**
- Scene composition (multiple sources mixed)
- Stream recording
- Custom overlays
- Professional production quality

**Current state:** The adapter connects via obs-websocket v5. It works as a video source alongside camera/screen/window. When Ruben wants to use OBS, it's just another source in the FrameSampler.

**No rush:** OBS integration is P2 (nice-to-have). The primary video pipeline (camera + screen + window) works without OBS.
