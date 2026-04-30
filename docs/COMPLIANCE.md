# Cumplimiento — Registro de Decisiones Arquitectónicas

**Última actualización:** 2026-04-30
**Responsable:** Ruben Alvarez
**Proyecto:** PROJECT-RAMIRO

---

## DEC-001: Sistema de memoria — Agent-Memory sobre Claude Code

- **Decisión:** Usar Agent-Memory (SQLite + FTS5 + Protocol interfaces) como sistema de memoria primario, complementando con el patrón de compaction de Claude Code (snip + auto-compact).
- **Estado:** VIGENTE
- **Justificación:** Claude Code usa archivos .md con YAML frontmatter — es un prompt hack para chatbot. Agent-Memory es arquitectura de software real: SQLite transaccional, FTS5 para búsqueda full-text, Protocol interfaces (subtyping estructural) que permiten cambiar el backend sin tocar la lógica de dominio. Claude Code aporta valor en la gestión de historial de conversación en tiempo real (snip de tool results viejos + auto-compact al 70% del contexto), y esos patrones se adoptan sobre la base de Agent-Memory.
- **Fuente:** Análisis propio del código fuente filtrado de Claude Code (`clawspring/compaction.py`, `clawspring/memory/store.py`, `clawspring/memory/consolidator.py`). SPEC-v5 de CLI-agent-memory (`/Users/ruben/Code/PROJECT-RAMIRO/RAW/PROJECT-agent/PROJECT-CLI-agent-memory/docs/SPEC-v5.md`). Batalla comparativa realizada el 2026-04-29.
- **Afecta a:** `src/application/services/audio/audio-pipeline.service.ts`, `src/application/services/context-manager.service.ts`, `src/application/services/memory.service.ts`, `src/core/ports/output/storage.port.ts`, `src/core/ports/output/vector.port.ts`, `src/infrastructure/adapters/storage/`
- **Si cambia, notificar a:** Ruben (decisión de infraestructura), módulo de orquestación (OrchestratorService), módulo de contexto (ContextManager)

---

## DEC-002: Motor RAG — Decisión diferida

- **Decisión:** Diferir la elección del motor RAG. Proceder con las 6 tareas agnósticas a RAG de la FASE 3.
- **Estado:** EN INVESTIGACIÓN
- **Justificación:** El motor RAG solo bloquea 3 tareas: indexador de documentos (chunking + embedding), búsqueda semántica con Qdrant, y TIER-06 pipe-rag. Las otras 6 tareas (compaction, memory store, consolidator, focus anchoring, MCP tool, test de sesión larga) son independientes del motor elegido. Diferir permite evaluar con datos reales antes de comprometerse. Candidatos: LlamaIndex, R2R, RagFlow, Haystack, Pathway.
- **Fuente:** Análisis de requisitos propio. Investigación de SOTA RAG engines 2025-2026 (tarea de background 20260429_32). Criterios: documentos de texto muy largos (cientos de páginas), algunas imágenes, algo de video, conversaciones de audio largas (1-2h), despliegue local o VPS única, integración con Qdrant + Python.
- **Afecta a:** `TIER-06` (pipe-rag en Jart-OS), `TIER-08` (Knowledge), `src/application/use-cases/knowledge/index-document.ts`, `src/infrastructure/adapters/knowledge/`
- **Si cambia, notificar a:** Ruben (decisión de stack), módulo de Knowledge, pipeline de ingestión de documentos

---

## DEC-003: Context windows por modelo — 128K tokens

- **Decisión:** Todos los modelos del stack tienen ventana de contexto de 128K tokens. Budget allocation: TIER-0 30%, TIER-1 25%, TIER-2 35%, TIER-3 10%.
- **Estado:** VIGENTE
- **Justificación:** Los modelos MiMo V2.5 Pro, MiMo V2 Omni, MiMo V2.5 Omni (Xiaomi Token Plan), Qwen 2.5 Omni (Alibaba DashScope) y GPT-4o (OpenAI) documentan 128K tokens de ventana de contexto. La asignación por TIER prioriza la conversación (35%) y la infraestructura (30%), relegando el turno actual al 10% ya que se renueva cada ciclo.
- **Fuente:** Documentación de Xiaomi Token Plan (`token-plan-ams.xiaomimimo.com`), documentación de Alibaba DashScope, documentación de OpenAI. Verificado vía MCP-realtime-tech-docs.
- **Afecta a:** `src/shared/constants/index.ts` (`DEFAULT_CONTEXT_WINDOW`), `src/application/services/context-manager.service.ts` (budget allocation), `src/core/domain/value-objects/knowledge-config.ts`
- **Si cambia, notificar a:** ContextManager, OrchestratorService, cualquier módulo que dependa de los budgets de tokens

---

## DEC-004: Routing de modelos — OMNI vs PRO

- **Decisión:** OMNI para velocidad y visión en tiempo real. PRO para razonamiento profundo. Ambos en paralelo para video. Reglas específicas definidas en `model-router.ts`.
- **Estado:** VIGENTE
- **Justificación:** MiMo tiene dos familias con fortalezas distintas. OMNI (mimo-v2-omni): entrada nativa de audio + visión, baja latencia, descripción de frames, detección de objetos. PRO (mimo-v2.5-pro): razonamiento profundo, análisis estructurado, resúmenes, comparaciones, preguntas tipo examen. Para video, ambos corren siempre en paralelo: OMNI describe lo que ve, PRO analiza y explica. El Orchestrator fusiona las respuestas.
- **Fuente:** Documentación de Xiaomi MiMo V2 (MCP-realtime-tech-docs: `/Users/ruben/Code/PROJECT-MCP-realtime-tech-docs/docs/xiaomi-mimo/`). Análisis de capacidades realizado el 2026-04-29.
- **Afecta a:** `src/application/services/video/model-router.ts`, `src/application/services/video/dual-model-processor.ts`, `src/application/services/orchestrator.service.ts`, `src/core/domain/value-objects/model-config.ts`
- **Si cambia, notificar a:** DualModelProcessor, OrchestratorService, VideoPipelineService

---

## DEC-005: LiveKit vs getUserMedia — Coexistencia

- **Decisión:** Ambos coexisten. getUserMedia para captura local. LiveKit para relay remoto.
- **Estado:** VIGENTE
- **Justificación:** No son excluyentes. getUserMedia es la API del navegador para acceder al dispositivo (cámara, micrófono). LiveKit es un SFU (Selective Forwarding Unit) WebRTC para retransmisión. Para sesiones locales (Ruben habla con Ramiro en la misma máquina): getUserMedia es suficiente. Para sesiones remotas (Ruben en el móvil, Ramiro en Caroline/Hetzner): LiveKit proporciona el relay. Los adapters actuales usan getUserMedia para captura local. La integración con LiveKit es para relay remoto futuro.
- **Fuente:** Documentación de LiveKit (MCP-realtime-tech-docs), especificación WebRTC, documentación de getUserMedia (MDN).
- **Afecta a:** `src/infrastructure/adapters/audio/livekit-audio.adapter.ts`, `src/infrastructure/adapters/video/livekit-video.adapter.ts`, infraestructura de Caroline (Hetzner)
- **Si cambia, notificar a:** AudioPipelineService, VideoPipelineService, infraestructura de despliegue

---

## DEC-006: Persistencia multi-nivel — Nada se pierde

- **Decisión:** Persistencia en 8 niveles: streams crudos, episodios, entidades, decisiones, timeline, conclusiones, aprendizajes, resúmenes.
- **Estado:** VIGENTE
- **Justificación:** Ruben: "todo se guarda en nuestra memoria, a varios niveles diferentes." Cada nivel tiene un propósito distinto y un ciclo de vida diferente. Los streams crudos se guardan para siempre. Los resúmenes de conversación (TIER-2) se comprimen progresivamente. Los aprendizajes (knowledge gaps, fortalezas) se extraen al final de cada sesión. Al reanudar al día siguiente, Ramiro carga: último resumen, gaps de conocimiento, temas sin terminar, referencia al stream crudo.
- **Fuente:** Requisitos de Ruben (2026-04-29). Patrón de consolidación de Claude Code (`memory/consolidator.py`). Arquitectura de memoria de Agent-Memory (`SPEC-v5`).
- **Afecta a:** `src/application/services/memory.service.ts`, `src/application/services/context-manager.service.ts`, `src/infrastructure/adapters/storage/`, `src/core/ports/output/storage.port.ts`, `TIER-08` (Knowledge en Jart-OS)
- **Si cambia, notificar a:** MemoryService, ContextManager, módulo de Knowledge, módulo de persistencia de streams

---

## DEC-007: Detección de estancamiento (Stagnation Monitor)

- **Decisión:** Implementar StagnationMonitor con 3 triggers: mismo error 3 veces, 5 turnos sin información nueva, pregunta repetida (cache hit).
- **Estado:** VIGENTE
- **Justificación:** Sin detección de estancamiento, el agente puede entrar en bucles infinitos repitiendo el mismo error o la misma respuesta. El StagnationMonitor se sitúa entre el AudioPipeline y el LLM. Después de cada turno, registra el texto del usuario, la respuesta del asistente y cualquier error. Si detecta estancamiento, interviene ANTES de la siguiente llamada al LLM: trunca historial (mismo error), sugiere cambio de tema (sin progreso), o devuelve respuesta cacheada (pregunta repetida).
- **Fuente:** SPEC-v5 de Agent-Memory (`/Users/ruben/Code/PROJECT-RAMIRO/RAW/PROJECT-agent/PROJECT-CLI-agent-memory/docs/SPEC-v5.md`, SPEC-D4: StagnationMonitor).
- **Afecta a:** `src/application/services/audio/stagnation-monitor.ts`, `src/application/services/audio/audio-pipeline.service.ts`, `src/application/services/video/video-pipeline.service.ts`
- **Si cambia, notificar a:** AudioPipelineService, VideoPipelineService, módulo de orquestación

---

## DEC-008: Integración con OBS — Fuente de video opcional

- **Decisión:** OBS es una fuente de video opcional, no un requisito. El pipeline de video funciona sin OBS.
- **Estado:** VIGENTE
- **Justificación:** OBS proporciona composición de escenas, grabación de stream, overlays personalizados y calidad de producción profesional. Pero el pipeline de video de Ramiro funciona con las fuentes nativas del navegador (cámara, pantalla, ventana). El OBSVideoAdapter se conecta vía obs-websocket v5 y funciona como una fuente más en el FrameSampler, junto a cámara/pantalla/ventana. No hay prisa: es P2.
- **Fuente:** Análisis propio. OBS WebSocket v5 protocol documentation.
- **Afecta a:** `src/infrastructure/adapters/video/obs-video.adapter.ts`, `src/application/services/video/frame-sampler.ts`
- **Si cambia, notificar a:** VideoPipelineService, FrameSampler

---

## DEC-009: Jart-OS — Ramiro como ciudadano de TIER-04

- **Decisión:** Ramiro es un agente transversal (Director of Communication), NO un ciudadano de TIER-04. Los TIERs son para infraestructura y apps (dónde se despliega). Los agentes son actores transversales (quién hace el trabajo). Ramiro vive en `agents/` y opera a través de todos los TIERs.
- **Estado:** VIGENTE (corregido 2026-04-30)
- **Justificación:** Jart-OS tiene 10 TIERs con responsabilidades claras. Ramiro pertenece a TIER-04 como agente con arquitectura interna Director + Executor + Guardian + Council. Usa TIER-00 (engines LLM), TIER-02 (gateway LiteLLM), TIER-03 (Redis/NATS), TIER-05 (AudioPipeline/VideoPipeline), TIER-06 (pipe-rag), TIER-07 (interfaces web/tauri/telegram), TIER-08 (Knowledge/Qdrant), TIER-09 (métricas/Prometheus).
- **Fuente:** Repositorio canónico de Jart-OS (`/Users/ruben/Code/Jart-OS/`). VISION.md, ARCHITECTURE.md, TIERS/. Definición original de la arquitectura por Ruben.
- **Afecta a:** Todo el proyecto. `docs/JART-OS-INTEGRATION.md`, `docs/KNOWLEDGE-TIER.md`, `docs/ARCHITECTURE.md`, todos los módulos de infraestructura.
- **Si cambia, notificar a:** Todo el equipo de desarrollo, módulo de despliegue (docker-compose), módulo de orquestación

---

## DEC-010: TIER 0 = Monitorización de infraestructura, NO contenido

- **Decisión:** TIER 0 (Palabra Santa) monitoriza infraestructura: puertos, drivers, engines LLM, proxies, recursos del sistema. NO contiene el temario de oposiciones ni documentos de estudio.
- **Estado:** VIGENTE
- **Justificación:** TIER 0 es "el punto de contacto que necesita Jart-OS para saber a qué huelen las nubes." Es el estado del sistema: GPU health, latencia de APIs, conexión NATS/Redis, estado de los proxies. El temario de oposiciones pertenece a TIER-1 (Knowledge, indexado en Qdrant como RAG). Confundir TIER-0 con contenido es un error arquitectónico que mezcla infraestructura con conocimiento.
- **Fuente:** Corrección de Ruben (2026-04-29). ARCHITECTURE.md de Jart-OS: "Metal boundary — local LLM engines, host security, host monitoring, machine-coupled proxy."
- **Afecta a:** `src/application/services/context-manager.service.ts` (TIER 0 assembly), `src/core/domain/value-objects/knowledge-config.ts`, `docs/KNOWLEDGE-TIER.md`
- **Si cambia, notificar a:** ContextManager, módulo de Knowledge, módulo de infraestructura
