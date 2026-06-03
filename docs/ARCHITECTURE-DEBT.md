# Architecture Debt & Known Gaps

**Last updated:** 2026-06-03

This document tracks known technical debt and gaps discovered during the
**recovery pass** (June 2026). Context: the repository was *"green on paper"* —
`ROADMAP.md` marked all phases complete, but the toolchain had never been run.
The build, typecheck, full test suite and lint all failed. Waves 0–3 of the
recovery restored a verifiable green baseline (lint 0 errors, typecheck 0,
74/74 tests, build OK, CI gates passing). The items below are the **remaining**
debt, deferred deliberately rather than rushed.

---

## 1. `FrameSampler` is DOM-bound application code (hexagonal violation)

**Where:** `src/application/services/video/frame-sampler.ts`

`FrameSampler` lives in the application layer but uses `document.createElement`,
`HTMLCanvasElement`, `MediaStream` and `setInterval` directly. The application
ring should not depend on the DOM.

**Why not fixed now:** the correct fix is a port (`IVideoFrameSource`) in `core`,
a DOM implementation in `infrastructure`, and moving the `SampledFrame` type into
`core/domain`. Simply relocating the file to `infrastructure` would create a
*worse* violation (application → infrastructure). The only consumer today is
`VideoPipelineService`, which is itself orphan (see §2), so the extraction is
best done when the video pipeline is actually wired.

**Plan:** Wave 4 — define `IVideoFrameSource` port, move `SampledFrame` to
`core/domain`, implement the DOM sampler in `infrastructure/adapters/video`.

## 2. Orphan services (scaffolded, never wired)

**Where:** `VideoPipelineService`, `RamiroMCPServer`, `RamiroKnowledgeMCP`

These classes are fully written but never instantiated anywhere. During recovery
their unused injected dependencies (`videoInput`, `stt`, `conflictResolver`,
`compactionService`) were removed to satisfy strict `noUnusedLocals`. When these
services are wired into the DI container, the dependencies they genuinely need
should be re-introduced through the constructor.

**Plan:** Wave 4 — wire into `AdapterFactory`/DI and add integration tests.

## 3. `AdapterFactory` resolves services it never registers

**Where:** `src/infrastructure/config/adapter-factory.ts`

`initializeAdapters` resolves `SERVICE_KEYS.AUDIO_OUTPUT` and
`SERVICE_KEYS.STT_PRIMARY`, but neither is ever `register`-ed. At runtime this
would throw on startup. There is currently no audio-output adapter implementation
and WhisperKit (STT primary) is a native bridge handled at the presentation layer.

**Plan:** Wave 4 — implement/register an audio-output adapter and the STT primary
binding (or resolve them lazily/optionally) before the app is run for real.

## 4. Frame pixel payload is not actually transported

**Where:** `start-video-stream` use-case builds `ImageBuffer` with
`data: new Uint8Array(0)` (placeholder); `VideoFrame` now carries metadata only.

Real frame bytes are never encoded and passed to the multimodal models yet. When
implemented, encoding must stay in infrastructure/presentation and cross the
boundary as a domain-neutral `ImageBuffer` (never a DOM type — see the note in
`core/domain/types.ts`).

**Plan:** Wave 4 — wire real frame encoding through the video pipeline.

## 5. `noNonNullAssertion` warnings (41)

**Where:** across services and tests.

These are **warnings, not errors** (`biome.json` sets the rule to `warn`), so
they do not block CI. They exist because `tsconfig` enables
`noUncheckedIndexedAccess`, which makes indexed access `T | undefined`; the `!`
is the sanctioned escape hatch where the index is provably in-bounds. The two
settings are intentionally in tension. Leaving these as visible-but-non-blocking
warnings is the considered choice — neither disabling the rule (hides the smell)
nor mass-rewriting to optional chaining (changes semantics) is preferable.

**Plan:** opportunistic — narrow individual sites to explicit guards when the
surrounding code is touched. No dedicated sweep.

---

## Prevention

- `bash scripts/verify.sh` runs the full gate (install + lint + typecheck +
  test + build) — the same checks CI enforces. Run before pushing.
- `.github/workflows/ci.yml` gates `lint`, `typecheck`, `test` (with coverage)
  and `build` on PRs to `main`.
- `.claude/settings.json` has a `SessionStart` hook that installs dependencies
  so web sessions start ready to run the toolchain.
