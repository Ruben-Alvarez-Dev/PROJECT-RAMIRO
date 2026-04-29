# Testing Strategy

---

## Pyramid

```
         ┌─────────┐
         │   E2E   │  Playwright (Web), XCTest (macOS), Espresso (Android)
        ┌┴─────────┴┐
        │Integration │  Service + adapter integration, MCP protocol
       ┌┴───────────┴┐
       │    Unit      │  Vitest (core, application, infrastructure)
      └───────────────┘
```

## Coverage Targets

| Layer | Target | Tool |
|-------|--------|------|
| Core (domain + ports) | 100% | Vitest |
| Application (use cases) | 90% | Vitest |
| Infrastructure (adapters) | 70% | Vitest + integration |
| Presentation (components) | 60% | Vitest + Testing Library |
| E2E (critical paths) | Smoke tests | Playwright |

## Test Organization

```
src/
├── core/
│   └── domain/
│       └── entities/
│           ├── session.ts
│           └── session.spec.ts        # Unit: next to source
├── application/
│   └── use-cases/
│       └── audio/
│           ├── start-audio-session.ts
│           └── start-audio-session.spec.ts
├── infrastructure/
│   └── adapters/
│       └── audio/
│           └── livekit/
│               ├── livekit-audio.adapter.ts
│               └── livekit-audio.adapter.integration.spec.ts
└── tests/
    ├── e2e/
    │   ├── voice-session.spec.ts
    │   └── video-session.spec.ts
    ├── fixtures/
    │   ├── audio-samples/
    │   └── video-samples/
    └── mocks/
        ├── mock-llm.adapter.ts
        └── mock-audio.adapter.ts
```

## Critical Test Scenarios

| ID | Scenario | Type | Phase |
|----|----------|------|-------|
| T-1 | Voice session: speak → hear response <200ms | Integration | 1 |
| T-2 | VAD: silence → speech → silence detection accuracy | Unit | 1 |
| T-3 | Model failover: MiMo down → Qwen fallback | Integration | 1 |
| T-4 | 4 video sources simultaneously, no frame drops | Stress | 2 |
| T-5 | OMNI + PRO parallel processing, merged response | Integration | 2 |
| T-6 | TIER 0 never evicted under context pressure | Unit | 3 |
| T-7 | Auto-summarization preserves key facts | Unit | 3 |
| T-8 | 2-hour session: memory stable, no leaks | Stress | 3 |
| T-9 | Network interruption: reconnect + state recovery | E2E | 4 |
| T-10 | Cross-platform: same test suite passes on all | E2E | 5 |
