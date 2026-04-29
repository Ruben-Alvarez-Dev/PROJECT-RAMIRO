# Knowledge TIER System

---

## Overview

The TIER system manages knowledge with strict priority levels. Higher TIERs are sacred — they are never evicted, never summarized without explicit approval, and always available to the LLM context.

## TIER 0 — Sacred Word (Palabra Santa)

**Immutable. Non-negotiable. Always in context.**

| Property | Value |
|----------|-------|
| Max Size | Configurable (default: 200K tokens) |
| Eviction | NEVER |
| Modification | Manual only, version-controlled |
| Examples | Oposition syllabus, legal texts, exam criteria |
| Storage | File system + Qdrant (immutable index) |
| Refresh | Only via explicit `update-tier0` command |

```
knowledge/
├── tier-0/
│   ├── opositions/
│   │   ├── temario-completo.md
│   │   ├── criterios-evaluacion.md
│   │   └── legislacion-vigente.md
│   └── config.yaml
```

### Rules
1. TIER 0 content is ALWAYS included in the system prompt
2. TIER 0 is NEVER summarized or compressed
3. TIER 0 changes require version bump + commit
4. TIER 0 takes priority over all other TIERs when context is limited

## TIER 1 — Core Knowledge

**Indexed. Searchable. Retrieved on demand.**

| Property | Value |
|----------|-------|
| Max Size | Unlimited (indexed) |
| Retrieval | Semantic search via Qdrant |
| Examples | Documentation, reference materials, study notes |
| Storage | Qdrant vectors + file system |
| Refresh | Automatic from MCP servers |

```
knowledge/
├── tier-1/
│   ├── documents/          # Raw source documents
│   ├── index/              # Qdrant collection metadata
│   └── collections.yaml    # Collection definitions
```

### Rules
1. All TIER 1 content is indexed on ingestion
2. Retrieved via semantic search when relevant to conversation
3. Auto-chunked with configurable overlap (default: 512 tokens, 64 overlap)
4. Metadata preserved: source, date, category, relevance score

## TIER 2 — Dynamic Context

**Session-scoped. Auto-summarized. Progressively compressed.**

| Property | Value |
|----------|-------|
| Max Size | Configurable (default: 50% of context window) |
| Lifecycle | Born → Active → Summarized → Archived |
| Examples | Conversation history, tool results, intermediate reasoning |
| Storage | SQLite (session) + memory cache |
| Compression | Auto-summarization when >80% capacity |

### Compression Strategy
```
Full Detail (last 10 messages)
    │
    ▼
Summary (messages 11-50)
    │
    ▼
Key Points Only (messages 51+)
    │
    ▼
Archived (accessible via explicit recall)
```

### Rules
1. Last N messages always in full detail (configurable, default: 10)
2. Older messages progressively summarized
3. Key decisions and facts preserved as bullet points
4. Archive accessible via `chatrecall` MCP tool

## TIER 3 — Ephemeral

**Current turn only. Not persisted.**

| Property | Value |
|----------|-------|
| Max Size | Remaining context window |
| Lifecycle | Single turn |
| Examples | Current video frames, audio buffer, tool call results |
| Storage | In-memory only |

### Rules
1. Discarded after each response cycle
2. Never persisted to storage
3. Can be larger than other TIERs (uses available space)
4. Frame samples from video streams live here

## Context Assembly Algorithm

```
function assembleContext(window_size, tiers):
    remaining = window_size
    context = []

    # 1. TIER 0 — Always included, never cut
    tier0 = compress_if_needed(tiers[0], remaining * 0.3)
    context.append(tier0)
    remaining -= tier0.size

    # 2. TIER 3 — Current ephemeral data
    tier3 = tiers[3]  # already sized to fit
    context.append(tier3)
    remaining -= tier3.size

    # 3. TIER 2 — Dynamic conversation context
    tier2 = tiers[2]
    if tier2.size > remaining * 0.7:
        tier2 = auto_summarize(tier2, remaining * 0.7)
    context.append(tier2)
    remaining -= tier2.size

    # 4. TIER 1 — Retrieved knowledge (fill remaining space)
    tier1 = retrieve_relevant(tiers[1], query, remaining)
    context.append(tier1)

    return context
```

## Auto-Cleanup Triggers

| Trigger | Action | Threshold |
|---------|--------|-----------|
| Context >80% | Summarize TIER 2 oldest messages | Automatic |
| Context >90% | Aggressive TIER 2 compression | Automatic |
| Context >95% | Drop TIER 3 low-priority frames | Automatic |
| Session >1h | Archive TIER 2 to long-term memory | Automatic |
| Explicit | `memory cleanup` command | Manual |

## Focus Anchoring

The system maintains conversational focus by tracking:
1. **Thread Topic**: Current subject of discussion
2. **Active Documents**: Which TIER 0/1 docs are being referenced
3. **User Intent**: What the user is trying to accomplish
4. **Session Goals**: Declared or inferred objectives

When context pressure occurs, the system preserves:
- Thread topic (always)
- Active TIER 0 references (always)
- Last 3 user messages (always)
- Current action/tool chain (always)
