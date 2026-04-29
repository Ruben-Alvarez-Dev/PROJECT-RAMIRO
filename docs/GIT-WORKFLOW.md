# Git Workflow & Contribution Guidelines

---

## Branch Strategy

```
main (production)
├── develop (integration)
│   ├── feature/phase-0-foundation
│   ├── feature/phase-1-audio
│   ├── feature/phase-2-video
│   ├── feature/phase-3-knowledge
│   └── ...
├── hotfix/critical-fix
└── release/v1.0.0
```

## Commit Convention

Format: `<type>(<scope>): <description>`

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | Code restructuring |
| `test` | Adding/modifying tests |
| `chore` | Build, CI, tooling |
| `perf` | Performance improvement |
| `style` | Formatting, no logic change |

### Examples

```
feat(core): add Session entity with state machine lifecycle
feat(audio): implement LiveKit audio adapter with WebRTC capture
docs(architecture): define hexagonal layer responsibilities
test(knowledge): add unit tests for TIER 0 immutable loading
refactor(llm): extract ModelRouter from OrchestratorService
perf(video): optimize frame sampling with configurable FPS
```

## Commit Rules

1. **Atomic**: One logical change per commit
2. **Granular**: 2-4 sentences in commit body explaining WHY
3. **English only**: All commit messages in English
4. **Push in same cycle**: Commit + push as atomic unit
5. **No WIP on main**: All work on feature branches
6. **Signed commits**: GPG or SSH signing preferred

## Pull Request Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactor
- [ ] Test

## Checklist
- [ ] Code follows SOLID principles
- [ ] BEM naming for all CSS classes
- [ ] Unit tests pass
- [ ] No console.log / print statements
- [ ] Documentation updated if needed
```
