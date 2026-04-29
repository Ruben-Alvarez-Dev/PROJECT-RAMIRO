# Jart-OS Integration

**Last updated:** 2026-04-29

---

## 1. What Jart-OS Is

Jart-OS is a **tiered agentic operating system** that organizes AI services into 10 explicit layers (TIERs). Each TIER has a clear responsibility. Ramiro is a **citizen** of this system, not a TIER itself.

### The City Metaphor

```
TIER-00  METAL           → The ground (GPU drivers, LLM engines, host)
TIER-01  SECURITY        → The police (YubiKey, auth, encryption)
TIER-02  GATEWAY         → The roads (LiteLLM proxy, model routing)
TIER-03  SERVICES        → Water & electricity (Redis, NATS messaging)
TIER-04  AGENTS          → The citizens (Director, Executor, Guardian, Council)
TIER-05  FRAMEWORKS      → The tools (AudioPipeline, VideoPipeline)
TIER-06  PROCESSES       → The factories (PDF ingestion, RAG pipelines)
TIER-07  INTERFACES      → The storefronts (UI, dashboards, bots)
TIER-08  KNOWLEDGE       → The libraries (memory, RAG, semantic stores)
TIER-09  CONTROL         → The city hall (metrics, health, supervision)
```

---

## 2. Where Ramiro Lives

Ramiro is a **citizen agent** in TIER-04 (AGENTS). It uses resources from multiple TIERs:

```
RAMIRO (citizen of TIER-04)
├── Uses TIER-00: MiMo, Qwen engines (via TIER-02 gateway)
├── Uses TIER-01: API authentication
├── Uses TIER-02: LiteLLM for model routing
├── Uses TIER-03: Redis for cache, NATS for events
├── IS    TIER-04: An agent with Director + Executor + Guardian + Council
├── Uses TIER-05: AudioPipeline + VideoPipeline (tools)
├── Uses TIER-06: pipe-rag for document ingestion (opposition syllabus)
├── Exposes TIER-07: Web/Tauri UI + Telegram bot (interfaces)
├── Uses TIER-08: Knowledge base (syllabus, study notes, RAG via Qdrant)
└── Reports TIER-09: Metrics to Prometheus
```

---

## 3. Ramiro's Internal Architecture (Director + Executor + Guardian + Council)

Following Jart-OS TIER-04 pattern, Ramiro has **4 internal roles**:

### 3.1 Director (Orchestrator)

```yaml
role: director
model: mimo-v2.5-pro
temperature: 0.7
description: "Plans and decomposes tasks. Receives user requests,
  generates specs, delegates to Executor."
responsibilities:
  - receive_user_request
  - decompose_into_subtasks
  - create_spec_per_subtask
  - delegate_to_executor
  - monitor_progress
  - assemble_final_result
```

The Director receives the user's question (voice, video, or text), decomposes it into subtasks, and delegates to the Executor.

### 3.2 Executor (Content Generator)

```yaml
role: executor
model: mimo-v2.5-pro
temperature: 0.3
description: "Executes concrete specs, generates content,
  reports results to Guardian for validation."
responsibilities:
  - receive_spec_from_director
  - execute_single_subtask
  - generate_content (via LLM + TTS)
  - report_to_guardian
  - retry_on_fail_with_feedback
```

The Executor generates the actual response content. For voice sessions, this includes TTS synthesis.

### 3.3 Guardian (Quality Gate)

```yaml
role: guardian
model: mimo-v2.5-pro
temperature: 0.1
description: "Validates outputs against policy gates.
  Issues PASS/FAIL verdicts. Escalates to Council if max retries exhausted."
responsibilities:
  - validate_output_post_execution
  - enforce_quality_thresholds
  - issue_pass_fail_verdicts
  - escalate_to_council (after 3 failures)
```

The Guardian validates every output against quality criteria. If it fails 3 times, it escalates to the Council.

### 3.4 Council (3 Perspectives)

```yaml
role: council
models: [mimo-v2.5-pro, mimo-v2.5-pro, mimo-v2.5-pro]
temperature: 0.2
description: "Votes on disagreements or escalations.
  Three perspectives: Content, Accuracy, Pedagogy."
```

**Three perspectives:**

| Perspective | Focus | Model |
|------------|-------|-------|
| **Content** | Is the response factually correct? Does it match the syllabus? | mimo-v2.5-pro |
| **Accuracy** | Is the technical/exam content accurate? Are citations correct? | mimo-v2.5-pro |
| **Pedagogy** | Is the response well-structured for learning? Does it help the student? | mimo-v2.5-pro |

**Consensus thresholds:**
- Normal tasks: 66% (2 of 3 approve)
- Critical tasks: 100% (unanimity)

---

## 4. Ramiro's Flow Through Jart-OS TIERs

### 4.1 Voice Session Flow

```
User speaks → TIER-07 (Interface: Web/Tauri)
  → TIER-02 (Gateway: LiteLLM routes to MiMo)
  → TIER-04 (Agent: Director plans)
  → TIER-05 (Framework: AudioPipeline processes)
    → VAD → STT → Context Assembly
  → TIER-08 (Knowledge: RAG searches syllabus)
  → TIER-04 (Agent: Executor generates response)
  → TIER-04 (Agent: Guardian validates)
  → TIER-04 (Agent: Council votes if escalated)
  → TIER-05 (Framework: TTS synthesizes)
  → TIER-07 (Interface: Audio output)
```

### 4.2 Video Session Flow

```
User shares screen → TIER-07 (Interface: Web/Tauri)
  → TIER-05 (Framework: FrameSampler captures)
  → TIER-04 (Agent: Director plans)
  → TIER-05 (Framework: DualModelProcessor runs OMNI+PRO)
  → TIER-08 (Knowledge: RAG searches relevant docs)
  → TIER-04 (Agent: Executor merges responses)
  → TIER-04 (Agent: Guardian validates)
  → TIER-07 (Interface: Video grid + TTS output)
```

### 4.3 Document Ingestion Flow

```
User drops PDF → TIER-07 (Interface: Upload)
  → TIER-06 (Process: pipe-rag ingests)
    → Chunking → Embedding → Indexing
  → TIER-08 (Knowledge: Qdrant stores vectors)
  → TIER-04 (Agent: Guardian validates quality)
  → TIER-09 (Control: Metrics updated)
```

---

## 5. NATS Subject Convention

Following Jart-OS pattern:

```
jart-os.04.ramiro.{role}.{domain}.command
jart-os.04.ramiro.{role}.{domain}.events
jart-os.04.ramiro.{role}.{domain}.errors
jart-os.04.ramiro.{role}.{domain}.verdicts
jart-os.04.ramiro.{role}.{domain}.escalation
jart-os.04.ramiro.{role}.{domain}.proposals
jart-os.04.ramiro.{role}.{domain}.votes
jart-os.04.ramiro.{role}.{domain}.decision
```

Example subjects:
```
jart-os.04.ramiro.director.study.command    # User request arrives here
jart-os.04.ramiro.executor.study.command    # Director delegates here
jart-os.04.ramiro.guardian.study.checks     # Executor submits for validation
jart-os.04.ramiro.council.study.escalation  # Guardian escalates after 3 failures
jart-os.04.ramiro.council.study.decision    # Council final verdict
```

---

## 6. Configuration

### 6.1 domain.yaml for Ramiro Director

```yaml
id: ESP-ACA-DIR-001-ramiro_director
role: director
domain: study
tier: 4
model: mimo-v2.5-pro
temperature: 0.7
port: 10411

description: "Plans and decomposes tasks for Ramiro multimodal agent.
  Receives voice/video/text requests, generates specs, delegates to Executor."

responsibilities:
  - receive_user_request
  - decompose_into_subtasks
  - create_spec_per_subtask
  - delegate_to_executor
  - monitor_progress
  - assemble_final_result

nats_subjects:
  listen: "jart-os.04.ramiro.director.command"
  events: "jart-os.04.ramiro.director.events"
  errors: "jart-os.04.ramiro.director.errors"

dependencies:
  executor: "jart-os.04.ramiro.executor.command"
  guardian: "jart-os.04.ramiro.guardian.checks"
  council: "jart-os.04.ramiro.council.proposals"
```

### 6.2 domain.yaml for Ramiro Guardian

```yaml
id: ESP-ACA-ARC-001-ramiro_guardian
role: guardian
domain: study
tier: 4
model: mimo-v2.5-pro
temperature: 0.1
port: 10413

description: "Validates Ramiro outputs against policy gates.
  Issues PASS/FAIL verdicts. Escalates to Council if max retries exhausted."

responsibilities:
  - validate_output_post_execution
  - enforce_quality_thresholds
  - issue_pass_fail_verdicts
  - escalate_to_council

nats_subjects:
  listen: "jart-os.04.ramiro.guardian.checks"
  events: "jart-os.04.ramiro.guardian.verdicts"
  errors: "jart-os.04.ramiro.guardian.errors"
  escalation: "jart-os.04.ramiro.council.escalation"
```

### 6.3 domain.yaml for Ramiro Council

```yaml
id: ESP-ACA-CNO-001-ramiro_council
role: council
domain: study
tier: 4
models: [mimo-v2.5-pro, mimo-v2.5-pro, mimo-v2.5-pro]
temperature: 0.2
port: 10414

description: "Votes on disagreements or escalations for Ramiro.
  Three perspectives: Content, Accuracy, Pedagogy.
  Consensus 66% normal, 100% critical."

perspectives:
  - name: content
    focus: "Is the response factually correct? Does it match the syllabus?"
  - name: accuracy
    focus: "Is the technical/exam content accurate? Are citations correct?"
  - name: pedagogy
    focus: "Is the response well-structured for learning?"

nats_subjects:
  listen: "jart-os.04.ramiro.council.escalation"
  proposals: "jart-os.04.ramiro.council.proposals"
  votes: "jart-os.04.ramiro.council.votes"
  decision: "jart-os.04.ramiro.council.decision"
```

---

## 7. Integration with Existing Goose MCP Tools

Ramiro exposes itself to Goose via MCP tools:

| MCP Tool | TIER | Purpose |
|----------|------|---------|
| `ramiro-voice` | TIER-07 | Start/stop voice session |
| `ramiro-video` | TIER-07 | Start/stop video session |
| `ramiro-knowledge` | TIER-08 | Search syllabus, ingest documents |
| `ramiro-memory` | TIER-08 | Session memory, long-term recall |
| `ramiro-council` | TIER-04 | Force council vote on content |

---

## 8. Future: Federation with Other Agents

Following Jart-OS TIER-04 pattern, Ramiro can federate with other agents:

```
jart-os.04.ramiro.study.*          # Ramiro (study domain)
jart-os.04.codemaster.code.*       # CodeMaster (code domain)
jart-os.04.researcher.research.*   # Researcher (research domain)
jart-os.04.infra.ops.*             # InfraAgent (operations domain)
```

Each agent is a **citizen** with its own Director + Executor + Guardian + Council.
