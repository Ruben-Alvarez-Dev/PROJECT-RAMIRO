# Knowledge TIER System

**Last updated:** 2026-04-29  
**Status:** CORRECTED — Aligned with Jart-OS TIER-08 canonical architecture

---

## Overview

The Knowledge TIER system lives inside **Jart-OS TIER-08 (KNOWLEDGE)**. It is NOT a standalone system — it is the knowledge layer of the entire agentic operating system.

Ramiro's knowledge management follows a strict hierarchy. Higher TIERs are more reliable and harder to evict. The system is designed for **long study sessions** (1-2 hours) with **auto-cleanup** and **focus anchoring** on the current topic.

---

## TIER 0 — Sacred Word (Palabra Santa) — CORRECTED

**What it IS:** Infrastructure monitoring. The "point of contact" that Jart-OS uses to know "what the clouds smell like."

| Property | Value |
|----------|-------|
| Purpose | Monitor infrastructure state, ports, drivers, LLM engines, proxies |
| Eviction | NEVER |
| Examples | GPU health, LLM provider status, NATS connection, Redis health |
| Where | Jart-OS TIER-00 (Metal) + TIER-09 (Control) |
| NOT | Syllabus, documents, study materials |

### What TIER 0 monitors:
- LLM engine availability (MiMo, Qwen, OpenAI)
- API endpoint health (latency, error rate)
- NATS/Redis connection status
- GPU/memory utilization
- Proxy routing state (LiteLLM)

### Where does the opposition syllabus go?

The syllabus goes in **TIER 1** as indexed knowledge, NOT in TIER 0. TIER 0 is for infrastructure awareness, not content.

---

## TIER 1 — Core Knowledge (Indexed + Retrieved)

**Indexed. Searchable. Retrieved on demand via semantic search.**

| Property | Value |
|----------|-------|
| Max Size | Unlimited (indexed in Qdrant) |
| Retrieval | Semantic search via vector similarity |
| Examples | Opposition syllabus, study notes, legal texts, exam criteria |
| Storage | Qdrant vectors + file system |
| Refresh | Automatic from RAG pipeline (Jart-OS TIER-06 pipe-rag) |

### What lives here:
- **Opposition syllabus** — the full temario, chunked and indexed
- **Study materials** — notes, summaries, practice exams
- **Legal/regulatory texts** — current legislation
- **Reference documents** — criteria, evaluation rubrics

### RAG Pipeline (Jart-OS TIER-06):
```
User drops PDF → TIER-06 (pipe-rag)
  → Text extraction
  → Chunking (512 tokens, 64 overlap)
  → Embedding generation
  → Qdrant indexing (TIER-08)
  → Available for semantic search
```

---

## TIER 2 — Dynamic Context (Session-scoped, Auto-summarized)

**Session-scoped. Auto-summarized. Progressively compressed.**

| Property | Value |
|----------|-------|
| Max Size | Configurable (default: 35% of context window) |
| Lifecycle | Born → Active → Summarized → Archived |
| Examples | Conversation history, tool results, intermediate reasoning |
| Storage | In-memory during session, SQLite for persistence |
| Compression | Auto-summarization when >80% capacity |

### Compression Strategy (from Claude Code analysis):

**Layer 1 — Snip old tool results:**
For messages older than the last 6 turns:
- Keep first half of content
- Keep last quarter of content
- Replace middle with `[... N chars snipped ...]`

**Layer 2 — Auto-compact:**
When context exceeds 70% of window:
1. Walk backwards from end, accumulate tokens
2. Find split point at 30% keep ratio
3. Summarize old portion via LLM call
4. Replace with: `[Previous conversation summary] + recent messages`

### Focus Anchoring:
When the conversation has a clear topic (e.g., "Constitución Española"), the system:
1. Tracks the current topic via entity extraction
2. Boosts relevance scores for documents matching the topic
3. Deprioritizes unrelated TIER 1 results

---

## TIER 3 — Ephemeral (Current turn only)

**Not persisted. Not summarized. Discarded after use.**

| Property | Value |
|----------|-------|
| Max Size | 10% of context window |
| Lifecycle | Single turn |
| Examples | Current user message, immediate tool results |
| Storage | In-memory only |

---

## Context Assembly Algorithm

```typescript
function assembleContext(config, currentMessage, history, windowSize) {
  const budget = {
    tier0: windowSize * 0.30,  // Infrastructure status (30%)
    tier1: windowSize * 0.25,  // Knowledge retrieval (25%)
    tier2: windowSize * 0.35,  // Conversation history (35%)
    tier3: windowSize * 0.10,  // Current message (10%)
  };

  // TIER 0 — Infrastructure status
  const infraStatus = await getInfrastructureStatus();
  // LLM health, NATS status, GPU utilization

  // TIER 1 — Knowledge retrieval
  const relevantDocs = await qdrant.search(currentMessage, 5);
  // Semantic search across indexed syllabus and documents

  // TIER 2 — Conversation history (progressive compression)
  const compressedHistory = compressHistory(history, budget.tier2);
  // Layer 1: Snip old tool results
  // Layer 2: Auto-compact if >70% capacity

  // TIER 3 — Current message
  const currentContext = currentMessage;

  return [infraStatus, relevantDocs, compressedHistory, currentContext].join('\n\n---\n\n');
}
```

---

## Auto-Cleanup Triggers

| Threshold | Action |
|-----------|--------|
| 60% context used | No action |
| 70% context used | Layer 1: Snip old tool results |
| 80% context used | Layer 2: Auto-compact (summarize old messages) |
| 90% context used | Aggressive: Archive session, start fresh |
| 95% context used | Emergency: Force session restart |

---

## Memory Persistence (Claude Code Pattern + Agent-Memory)

### File-based Memory (Claude Code pattern):
```
~/.ramiro/memory/
  ├── MEMORY.md                 ← Index (auto-rebuilt, max 200 lines / 25KB)
  ├── user_prefers_concise.md   ← Entry with YAML frontmatter
  └── study_progress.md

.ramiro/memory/                 ← Project-scoped
  ├── MEMORY.md
  └── session_notes.md
```

Each entry:
```yaml
---
name: user_prefers_concise
description: User wants direct, concise responses
type: user
created: 2026-04-29
confidence: 0.90
source: consolidator
last_used_at: 2026-04-29
conflict_group: writing_style
---
[Cuerpo de la memoria]
```

### SQLite-based Memory (Agent-Memory pattern):
- FTS5 full-text search for fast recall
- Confidence scoring (user = 1.0, consolidator = 0.8)
- Stagnation detection (3 failed attempts → truncate history)
- Session consolidation (max 3 memories extracted per session)

### Which to use when:

| Scenario | System |
|----------|--------|
| Quick keyword lookup | SQLite FTS5 |
| Semantic search | Qdrant vectors |
| System prompt injection | MEMORY.md (file-based) |
| Session archiving | SQLite + MEMORY.md |
| Between-session persistence | Goose Memory.rememberMemory |
