# Recovery Report — June 2026

**Date:** 2026-06-03
**Branch:** `claude/repo-analysis-KsrIH`
**Outcome:** verifiable green baseline restored (lint 0 · typecheck 0 · 74/74 tests · build OK · CI ~87% coverage)

This is the full record of the recovery pass. Summaries live in
[`ROADMAP.md`](./ROADMAP.md); remaining debt lives in
[`ARCHITECTURE-DEBT.md`](./ARCHITECTURE-DEBT.md). This file is the *why* and the
*what changed*.

---

## 1. Diagnosis — root cause

The repository was **"green on paper."** `ROADMAP.md` marked all five phases ✅
complete with commit hashes, but **no quality gate had ever been executed**.
Running them revealed:

| Gate | State on arrival |
|------|------------------|
| `biome check` (lint) | 197 errors, 58 warnings |
| `tsc --noEmit` (typecheck) | 52 errors (incl. production code) |
| `vitest run` (tests) | 9 of 12 suites failing |
| `vite build` | broken (tests dragged into the prod tsc step) |
| CI `vitest --coverage` | missing coverage provider |
| Lockfile | none committed (CI uses `--frozen-lockfile`) |

Every failure traced to a single root cause: **the toolchain was never run.**
The clinching evidence — six test files began with a literal Markdown heading
`# src/tests/unit/<file>.spec.ts`, leftover from pasting code out of Markdown
fences. They could never have parsed; therefore the suite had never run.

## 2. Strategy — four waves, ordered by dependency

Fixes were sequenced so each wave unblocked the next, with a commit per wave so
the history reads as a recovery, not a single opaque dump.

| Wave | Goal | Commit |
|------|------|--------|
| 0 | Build / typecheck / tests green | `19a3525` |
| 1 | Lint gate green | `ced97dd` |
| 2 | Hexagonal boundaries + build isolation | `f4c021c` |
| 3 | CI reliability + prevention + honest docs | `2f81c23` |

## 3. Wave 0 — green baseline

**Correctness bugs (production):**
- **Orchestrator failover never fired.** `execute()` did `return this.executeWithAdapter(...)` inside a `try` *without* `await`; the adapter rejects *inside* its `for await`, so the rejected promise escaped the synchronous `try/catch` and failover never ran. Fix: `return await`.
- `types.ts`: value-object types (`AudioConfig`, `VideoConfig`, `ModelConfig`, `KnowledgeConfig`) were only re-exported, never imported, so local references didn't resolve. Also `MultimodalRequest.images` was `ImageData[]` (DOM) → `ImageBuffer[]`, and a missing `stream?` field.
- `MemoryEntry` was defined three times; the memory barrel clashed. The conflict-resolver's distinct type was renamed `ConflictEntry`.
- `audio-pipeline`: `handleVADEvent` declared `: void` on an `async` method → `Promise<void>`.
- `adapter-factory`: missing `IAudioOutputPort` import.
- `mimo-tts`: TS 5.7 generic typed arrays — `buffer`/`concatBuffers` retyped to `Uint8Array<ArrayBufferLike>`.
- `mcp-server`: `logger.error` was passed a context object where it expects an `Error`.
- `main.tsx`: imported `./App` (nonexistent) → `../web/App`.

**Tests:**
- vitest `environment` `node` → `happy-dom` (DOM-dependent specs).
- Removed the stray Markdown header from 6 specs.
- Fixed wrong type-import paths (`LLMChunk`, `SampledFrame`) and string-literal-vs-enum mismatches.
- Rewrote the compaction Layer-1 and frame-sampler cap tests to be deterministic.
- focus-anchoring: same-topic detection now uses the **overlap coefficient** (`∩ / min`) instead of `∩ / max`, so a shorter follow-up message correctly reinforces the active topic.

**Cleanup:** removed dead injected dependencies, write-only state, unused loggers/locals; applied Biome's safe autofixes; committed `bun.lock`.

## 4. Wave 1 — lint

Biome 197 → 0 errors. `forEach`→`for...of`; removed `as any` (real DOM types,
domain types in tests, `vi.mocked()`); a11y (`type="button"`, keyboard-accessible
`VideoGrid` cells); template-literal/string fixes; removed a useless constructor;
annotated intentional generator mocks.

**Decision — `noNonNullAssertion` (41 sites):** kept as **warning**, not error.
They are the sanctioned escape hatch for `noUncheckedIndexedAccess` (which makes
indexed access `T | undefined`). The two settings are intentionally in tension;
leaving these visible-but-non-blocking is the considered choice, rather than
disabling the rule (hides the smell) or mass-rewriting to `?.` (changes
semantics).

## 5. Wave 2 — architecture

- **Core is now DOM-free:** dropped `VideoFrame.data` (was `ImageData |
  HTMLCanvasElement | HTMLVideoElement`). It was produced by the LiveKit adapter
  but never consumed; pixels cross boundaries via `ImageBuffer`.
- `tsconfig`: removed the duplicate `lib` key.
- Added `tsconfig.build.json` (excludes tests); `build` now typechecks
  production only, so a broken test can't break the release build. The
  `typecheck` script still covers everything for dev/CI.

## 6. Wave 3 — CI, prevention, docs

- Added `@vitest/coverage-v8` (CI's `vitest run --coverage` was missing it).
- `scripts/verify.sh` — the full local gate, mirroring CI.
- `.claude/settings.json` `SessionStart` hook installs deps for web sessions.
- Honest recovery note in `ROADMAP.md`; `ARCHITECTURE-DEBT.md` for deferred items.

## 7. Deferred (Wave 4 — see ARCHITECTURE-DEBT.md)

`FrameSampler` DOM extraction behind a port; wiring the orphan services
(`VideoPipelineService`, MCP servers); `AdapterFactory` resolving unregistered
keys; real frame-pixel transport; SCSS `darken()` deprecation warnings. These
touch unwired/orphan code where the correct fix requires wiring first, so they
were deferred rather than rushed.

## 8. How to verify

```bash
bash scripts/verify.sh   # install + lint + typecheck + test + build
```
