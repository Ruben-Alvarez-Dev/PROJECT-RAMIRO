#!/usr/bin/env bash
# Runs the full quality gate locally — the same checks CI enforces.
# Use before pushing: `bash scripts/verify.sh`
#
# This script exists because the project was once "green on paper" (docs marked
# every phase complete) while lint, typecheck, tests and build all failed —
# the toolchain had simply never been run. Run it and keep it green.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "▶ Installing dependencies (frozen lockfile)…"
bun install --frozen-lockfile

echo "▶ Lint (biome)…"
bun run lint

echo "▶ Typecheck (tsc, full incl. tests)…"
bun run typecheck

echo "▶ Unit tests…"
bun run test:run

echo "▶ Production build…"
bun run build

echo "✓ All gates passed."
