# Jart-OS Integration — CORRECTED

**Last updated:** 2026-04-30
**Status:** CORRECTED — Ramiro is a transversal agent, not a TIER citizen

---

## 1. Jart-OS Architecture — Primitives and Constructors

### True Primitives (can't be broken down further):

| Primitive | Description |
|-----------|-------------|
| **Doc** | A document |
| **Service** | A deployable unit |
| **Agent** | An autonomous actor with a role |
| **Domain** | A knowledge area |
| **Subject** | A topic within a domain |
| **Process** | A transformation pipeline |

### Constructors (combine primitives):

| Constructor | Collection | Dimension |
|-------------|-----------|-----------|
| `docs/` | Collection of Docs → organized by section | WHAT we know (reference) |
| `infra/` | Collection of Services → organized by Tier | WHERE things run (deployment) |
| `agents/` | Collection of Agents → organized by role | WHO does the work (actors) |
| `academy/` | Hierarchy of Domains → Subjects → organized by faculty | WHAT we teach (knowledge graph) |
| `processes/` | Collection of Processes → organized by type | HOW things get done (operations) |

Each constructor is a **DIFFERENT dimension** of the system.

---

## 2. Where Ramiro Lives

Ramiro is a **transversal agent** — a "Director of Communication" that operates across all TIERs. Ramiro does NOT live in TIER-04.

```
agents/
├── ramiro/                  ← Ramiro lives HERE, as an Agent primitive
│   ├── director.py          ← Plans and decomposes tasks
│   ├── executor.py          ← Executes and generates content
│   ├── guardian.py          ← Validates quality
│   └── council.py           ← 3-perspective voting
│
├── director/                ← Other agents
├── executor/
├── guardian/
└── council/
```

### Why Ramiro is transversal:

- Ramiro **uses** infra/ (services deployed in TIERs)
- Ramiro **uses** docs/ (reference knowledge)
- Ramiro **uses** academy/ (study domain knowledge)
- Ramiro **uses** processes/ (RAG pipelines, ingestion)
- But Ramiro **lives** in agents/ as an autonomous actor

### The TIERs are for infrastructure and apps, NOT for system operators:

```
infra/ (organized by Tier)
├── TIER-00 METAL/          ← GPU drivers, LLM engines
├── TIER-01 SECURITY/       ← YubiKey, auth
├── TIER-02 GATEWAY/        ← LiteLLM proxy
├── TIER-03 SERVICES/       ← Redis, NATS
├── TIER-04 AGENTS/         ← Agent runtime containers (NOT the agents themselves)
├── TIER-05 FRAMEWORKS/     ← AudioPipeline, VideoPipeline
├── TIER-06 PROCESSES/      ← pipe-rag, pipe-pdf, pipe-video
├── TIER-07 INTERFACES/     ← Mission Control, Grafana
├── TIER-08 KNOWLEDGE/      ← Qdrant, RAG stores
└── TIER-09 CONTROL/        ← Prometheus, metrics
```

The system operator agents (Ramiro, Director, Executor, Guardian, Council) are **outside** the TIERs. They orchestrate and use the TIERs.

---

## 3. Ramiro's Relationship with TIERs

Ramiro is a **transversal orchestrator** that touches multiple TIERs:

```
RAMIRO (transversal agent in agents/)
│
├── Uses TIER-00: MiMo engines, Qwen engines (via TIER-02 gateway)
├── Uses TIER-01: API authentication
├── Uses TIER-02: LiteLLM for model routing
├── Uses TIER-03: Redis for cache, NATS for events
├── Deploys TO TIER-04: His runtime containers
├── Uses TIER-05: AudioPipeline + VideoPipeline (tools)
├── Uses TIER-06: pipe-rag for document ingestion
├── Exposes TIER-07: Web/Tauri UI + Telegram bot
├── Uses TIER-08: Knowledge base (syllabus, RAG via Qdrant)
└── Reports TIER-09: Metrics to Prometheus
```

---

## 4. Ramiro's Internal Architecture

Following the Agent primitive, Ramiro has 4 internal roles:

| Role | Responsibility | Model | Temperature |
|------|---------------|-------|-------------|
| **Director** | Plans, decomposes, delegates | mimo-v2.5-pro | 0.7 |
| **Executor** | Generates content, executes specs | mimo-v2.5-pro | 0.3 |
| **Guardian** | Validates quality, issues PASS/FAIL | mimo-v2.5-pro | 0.1 |
| **Council** | 3-perspective voting (Content, Accuracy, Pedagogy) | mimo-v2.5-pro | 0.2 |

### Flow:
```
User request → Director plans → Executor generates → Guardian validates
                                                              │
                                                    ┌─────────┴─────────┐
                                                    │                   │
                                                  PASS               FAIL (3x)
                                                    │                   │
                                                    ▼                   ▼
                                              Response sent      Council votes
                                                                   │
                                                           ┌───────┴───────┐
                                                           │               │
                                                        APPROVE         REJECT
                                                           │               │
                                                           ▼               ▼
                                                     Response sent    Escalate to user
```

---

## 5. NATS Subject Convention (CORRECTED)

Ramiro as a transversal agent uses subjects that span across TIERs:

```
ramiro.{role}.{domain}.command       # User request arrives here
ramiro.{role}.{domain}.events        # Events published
ramiro.{role}.{domain}.errors        # Errors reported
ramiro.{role}.{domain}.verdicts      # Guardian verdicts
ramiro.{role}.{domain}.escalation    # Escalation to Council
ramiro.{role}.{domain}.proposals     # Council proposals
ramiro.{role}.{domain}.votes         # Council votes
ramiro.{role}.{domain}.decision      # Final decision
```

Note: No TIER prefix because Ramiro is transversal, not tied to a specific TIER.

---

## 6. Configuration (CORRECTED)

### agents/ramiro/config.yaml

```yaml
id: ramiro-multimodal-agent
type: agent
role: director_of_communication
scope: transversal  # NOT tied to a specific TIER

description: "Multimodal realtime agent for study sessions.
  Plans, executes, validates, and votes on content quality.
  Transversal: uses infra, docs, academy, and processes."

internal_roles:
  - director:
      model: mimo-v2.5-pro
      temperature: 0.7
      responsibilities: [plan, decompose, delegate, monitor, assemble]
  - executor:
      model: mimo-v2.5-pro
      temperature: 0.3
      responsibilities: [execute, generate, report, retry]
  - guardian:
      model: mimo-v2.5-pro
      temperature: 0.1
      responsibilities: [validate, enforce, verdict, escalate]
  - council:
      models: [mimo-v2.5-pro, mimo-v2.5-pro, mimo-v2.5-pro]
      temperature: 0.2
      perspectives: [content, accuracy, pedagogy]
      consensus_threshold: 0.66  # 2/3 for normal
      critical_threshold: 1.0    # 3/3 for critical

uses:
  infra: [TIER-00, TIER-02, TIER-03, TIER-05, TIER-08]
  docs: [syllabus, study-notes, legal-texts]
  academy: [study-domain, opposition-subjects]
  processes: [pipe-rag, pipe-pdf]

exposes:
  tier07: [web-ui, tauri-app, telegram-bot]
  mcp: [ramiro-voice, ramiro-video, ramiro-knowledge, ramiro-memory, ramiro-council]
```
