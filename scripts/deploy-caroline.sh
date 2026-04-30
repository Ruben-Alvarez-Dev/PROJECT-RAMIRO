#!/usr/bin/env bash
# Deploy Ramiro to Caroline (Hetzner VPS)
# Usage: ./scripts/deploy-caroline.sh [--build] [--restart] [--logs]

set -euo pipefail

REMOTE_HOST="${RAMIRO_REMOTE_HOST:-caroline}"
REMOTE_DIR="${RAMIRO_REMOTE_DIR:-/opt/ramiro}"
IMAGE_NAME="ramiro:latest"

build() {
  echo "🏗️  Building Docker image..."
  docker build -t "$IMAGE_NAME" -f Dockerfile .
  echo "✅ Build complete: $IMAGE_NAME"
}

sync() {
  echo "📦 Syncing to $REMOTE_HOST..."
  rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.venv' \
    --exclude 'dist' \
    --exclude '.git' \
    ./ "$REMOTE_HOST:$REMOTE_DIR/"
  echo "✅ Sync complete"
}

deploy() {
  echo "🚀 Deploying to $REMOTE_HOST..."
  ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose pull && docker compose up -d --remove-orphans"
  echo "✅ Deploy complete"
}

health_check() {
  echo "🏥 Running health check..."
  sleep 5
  ssh "$REMOTE_HOST" "curl -sf http://localhost:3000/health || echo '⚠️  Health check failed'"
}

restart() {
  echo "🔄 Restarting services..."
  ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose restart"
  echo "✅ Restart complete"
}

logs() {
  echo "📋 Showing logs..."
  ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker compose logs -f --tail=100"
}

case "${1:-deploy}" in
  --build) build ;;
  --restart) restart ;;
  --logs) logs ;;
  *)
    sync
    deploy
    health_check
    ;;
esac
