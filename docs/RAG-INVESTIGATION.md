# RAG Engine Investigation — Deep Dive

**Last updated:** 2026-04-30
**Status:** INVESTIGATION COMPLETE — Recommendation ready
**Decision:** DEC-002 (deferred)

---

## 1. Context

### Our Requirements

| Requirement | Priority | Detail |
|------------|----------|--------|
| Very long text documents | P0 | Opposition syllabus, legal texts (100-500 pages per document) |
| Some images | P1 | Diagrams, charts from study materials |
| Some video | P2 | Occasional clips |
| Long audio conversations | P0 | 1-2 hour voice sessions with Ramiro |
| Single user | — | Personal use, not enterprise |
| Single VPS | — | Hetzner: 8GB RAM, 4 cores |
| Qdrant integration | P0 | Already chosen as vector store |
| Python 3.12+ | P0 | Project stack |
| Docker deployable | P1 | For Caroline (Hetzner) |

### Why This Matters

The RAG engine sits at **Jart-OS TIER-06 (Processes)** and feeds **TIER-08 (Knowledge)**. It is the pipeline that:
1. Takes a 300-page PDF (opposition syllabus)
2. Chunks it intelligently (preserving section boundaries, tables, figures)
3. Generates embeddings
4. Indexes into Qdrant
5. Retrieves relevant chunks during Ramiro's conversations

The chunking strategy is **critical** — bad chunking on a 300-page legal text means Ramiro gives wrong answers about the law.

---

## 2. Engine Comparison

### 2.1 LlamaIndex

| Aspect | Detail |
|--------|--------|
| **GitHub** | ~40K stars, very active (daily commits) |
| **Chunking** | `SentenceSplitter`, `SemanticSplitterNodeParser`, `TokenTextSplitter`, `HierarchicalNodeParser` |
| **Long docs** | `HierarchicalNodeParser` — builds a tree: document → sections → paragraphs → sentences. Retrieves at the right granularity. |
| **Multi-modal** | ✅ Images via `MultiModalVectorStoreIndex`. Audio via Whisper integration. Video via frame extraction. |
| **Streaming** | ⚠️ Not native streaming ingestion. Batch-oriented. |
| **Qdrant** | ✅ Native integration: `llama-index-vector-stores-qdrant` |
| **Docker** | Lightweight — just pip install, no heavy infrastructure |
| **RAM** | ~500MB-1GB for indexing a 300-page document |
| **Python** | 3.9+ |
| **Strengths** | Largest ecosystem (300+ integrations), HierarchicalNodeParser is SOTA for long docs, LlamaParse for OCR |
| **Weaknesses** | API changes frequently, some integrations are fragile, LlamaParse (the best part) is cloud-only/paid |

**Verdict for our use case:** ⭐⭐⭐⭐ (4/5) — Best chunking for long documents via HierarchicalNodeParser. Qdrant native. Lightweight. But LlamaParse (agentic OCR) is cloud-only.

### 2.2 R2R (SciPhi)

| Aspect | Detail |
|--------|--------|
| **GitHub** | ~5K stars, active |
| **Chunking** | Recursive text splitting with configurable overlap. Uses Unstructured.io for document parsing. |
| **Long docs** | Standard chunking — no hierarchical approach. |
| **Multi-modal** | ✅ Images and audio via Unstructured.io parsing |
| **Streaming** | ⚠️ Batch-oriented |
| **Qdrant** | ✅ Native integration via `r2r` package |
| **Docker** | Docker Compose with Postgres + Qdrant + Neo4j |
| **RAM** | ~2-4GB (Postgres + Neo4j + Qdrant + app) |
| **Python** | 3.10+ |
| **Strengths** | Full RAG-as-a-service with auth, users, API. Good for multi-user. |
| **Weaknesses** | Heavy (3 databases), designed for multi-user SaaS not single-user study tool. No hierarchical chunking. |

**Verdict for our use case:** ⭐⭐ (2/5) — Too heavy for single-user. Over-engineered. No advantage over LlamaIndex for our needs.

### 2.3 RagFlow (InfiniFlow)

| Aspect | Detail |
|--------|--------|
| **GitHub** | ~40K stars, very active, trendshift #1 |
| **Chunking** | **BEST IN CLASS** — Layout-aware chunking. Parses PDFs preserving tables, figures, headers, multi-column layouts. Uses deep learning (DocLayout-YOLO) for document understanding. |
| **Long docs** | ✅ Excellent — understands document structure (chapters, sections, subsections). Chunks respect boundaries. |
| **Multi-modal** | ✅ Images parsed via OCR (Tesseract + PaddleOCR). Tables extracted as structured data. |
| **Streaming** | ⚠️ Batch ingestion, but very fast |
| **Qdrant** | ⚠️ Uses Elasticsearch by default. Qdrant integration exists but is secondary. |
| **Docker** | Docker Compose with Elasticsearch + MinIO + Redis + MySQL |
| **RAM** | ~4-8GB (heavy — Elasticsearch is hungry) |
| **Python** | 3.10+ |
| **Strengths** | Best document understanding. Layout-aware chunking is SOTA for academic/legal PDFs. Handles tables, figures, multi-column perfectly. |
| **Weaknesses** | Heavy infrastructure. Elasticsearch dependency (could replace with Qdrant but requires work). Overkill for simple text. |

**Verdict for our use case:** ⭐⭐⭐⭐⭐ (5/5) — **BEST FOR OUR USE CASE.** Opposition syllabus is exactly what RagFlow excels at: long structured PDFs with sections, tables, figures. The layout-aware chunking is precisely what we need for legal texts.

### 2.4 Haystack (deepset)

| Aspect | Detail |
|--------|--------|
| **GitHub** | ~18K stars, very active, well-maintained |
| **Chunking** | `DocumentSplitter` (by sentence, word, passage), `PreProcessor` with configurable splitting |
| **Long docs** | Standard chunking — no hierarchical or layout-aware approach |
| **Multi-modal** | ⚠️ Limited. Text-focused. Images via separate pipelines. |
| **Streaming** | ⚠️ Pipeline-based, not streaming |
| **Qdrant** | ✅ Native integration: `haystack-qdrant` |
| **Docker** | Lightweight — pip install |
| **RAM** | ~500MB-1GB |
| **Python** | 3.9+ |
| **Strengths** | Clean API, excellent for building custom pipelines, great docs, Hayhooks for MCP serving. Stable, production-proven. |
| **Weaknesses** | Chunking is basic. No hierarchical or layout-aware splitting. Multi-modal support is weak. |

**Verdict for our use case:** ⭐⭐⭐ (3/5) — Clean and stable, but chunking is too basic for 300-page legal PDFs. Would need custom splitter work.

### 2.5 Pathway

| Aspect | Detail |
|--------|--------|
| **GitHub** | ~10K stars, active |
| **Chunking** | Via Unstructured.io integration |
| **Long docs** | Standard via Unstructured |
| **Multi-modal** | Via Unstructured |
| **Streaming** | ✅ **BEST IN CLASS** — Rust-powered incremental computation. True streaming ingestion. |
| **Qdrant** | ✅ Native |
| **Docker** | Lightweight — pip install, Rust engine included |
| **RAM** | ~1-2GB |
| **Python** | 3.9+ |
| **Strengths** | True streaming. Rust engine. Same code for batch and streaming. Perfect for "drop a PDF while talking and it's indexed in seconds." |
| **Weaknesses** | Not a RAG framework per se — it's a data processing framework. You build RAG on top. Less batteries-included. |

**Verdict for our use case:** ⭐⭐⭐ (3/5) — Amazing streaming, but it's a data framework, not a RAG engine. Would need significant glue code.

---

## 3. Head-to-Head Comparison

| Criterion | LlamaIndex | R2R | **RagFlow** | Haystack | Pathway |
|-----------|:---:|:---:|:---:|:---:|:---:|
| **Chunking quality (long docs)** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Multi-modal** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Streaming ingestion** | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Qdrant native** | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| **RAM requirements** | 1GB | 4GB | 8GB | 1GB | 2GB |
| **Deploy simplicity** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **PDF/table understanding** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Community/activity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 4. Recommendation

### Primary: **RagFlow** — for document understanding

RagFlow's layout-aware chunking is SOTA for exactly our use case: long, structured PDFs with sections, tables, and figures (opposition syllabus). The 8GB RAM requirement is tight on Caroline (8GB total), but with swap it works.

**Action:** Deploy RagFlow on Caroline as Docker service. Replace its Elasticsearch with Qdrant (or run both — Elasticsearch for RagFlow's internal search, Qdrant for Ramiro's semantic search).

### Secondary: **LlamaIndex** — for the pipeline glue

LlamaIndex provides the Python API to connect RagFlow's output to Qdrant, handle multi-modal content, and manage the retrieval pipeline. Use `HierarchicalNodeParser` as fallback when RagFlow is not available.

**Action:** Use LlamaIndex as the Python SDK for retrieval + Qdrant integration. Let RagFlow handle the heavy document parsing.

### Streaming: **Pathway** pattern — for live ingestion

For "drop a PDF during conversation and it's indexed in 30 seconds" — use a simplified Pathway-style approach: watch a directory → trigger RagFlow ingestion → update Qdrant. No need to deploy full Pathway — just a filesystem watcher + RagFlow API call.

### Not recommended:
- **R2R**: Too heavy for single-user, no advantage over LlamaIndex
- **Haystack**: Chunking too basic for our legal/academic documents

---

## 5. Implementation Plan

```
Phase 3a: RagFlow deployment on Caroline (TIER-06)
├── Docker Compose: RagFlow + Qdrant + Redis
├── RAM: 6GB for RagFlow + 1GB for Qdrant + 1GB for system
├── Test: Ingest a 100-page PDF, verify chunk quality
└── Integration: Connect to Ramiro via LlamaIndex SDK

Phase 3b: LlamaIndex pipeline (TIER-08)
├── Retrieval: Qdrant vector store with LlamaIndex
├── Fallback: HierarchicalNodeParser for when RagFlow is down
├── Multi-modal: Image descriptions stored as text chunks
└── Audio: Whisper transcription → text chunks → Qdrant

Phase 3c: Live ingestion
├── Directory watcher: ~/Documents/ramiro-ingest/
├── On new file → trigger RagFlow parse → index into Qdrant
├── Notify Ramiro: "New document indexed: [filename]"
└── Target: 300-page PDF indexed in < 2 minutes
```

---

## 6. Decision Record

| Field | Value |
|-------|-------|
| **ADR** | DEC-002 |
| **Status** | DECIDED |
| **Decision** | RagFlow (primary, document understanding) + LlamaIndex (secondary, pipeline glue) |
| **Rationale** | RagFlow has SOTA layout-aware chunking for long structured PDFs. LlamaIndex provides the Python SDK for Qdrant integration and fallback chunking. |
| **Consequences** | Need 8GB RAM on Caroline (tight). Need to integrate RagFlow's Elasticsearch with Ramiro's Qdrant. |
| **Alternatives considered** | R2R (too heavy), Haystack (chunking too basic), Pathway (not a RAG engine), LlamaIndex alone (chunking not as good as RagFlow for PDFs) |
