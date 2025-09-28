#!/usr/bin/env bash
set -euo pipefail

# build_all.sh
# Unified helper: install deps & build the React frontend, then optionally start backend.
# Usage:
#   ./scripts/build_all.sh            # install & build frontend only
#   START_BACKEND=1 ./scripts/build_all.sh   # build frontend then start backend (npm start)
# Env Vars:
#   FRONTEND_DIR (default: frontend)
#   BACKEND_DIR  (default: backend)
#   NODE_ENV     (passed through; default left unset)
#   CI           If set, uses --no-fund --no-audit on npm install to reduce noise.
#
# Exits non‑zero on failure; prints concise progress markers.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Allow caller override via env; if not absolute, resolve relative to repo root
_fd_default=frontend
_bd_default=backend
FRONTEND_DIR=${FRONTEND_DIR:-$_fd_default}
BACKEND_DIR=${BACKEND_DIR:-$_bd_default}
case "$FRONTEND_DIR" in
  /*) ;; # absolute
  *) FRONTEND_DIR="$REPO_ROOT/$FRONTEND_DIR" ;;
esac
case "$BACKEND_DIR" in
  /*) ;; # absolute
  *) BACKEND_DIR="$REPO_ROOT/$BACKEND_DIR" ;;
esac

log() { printf '\n[build_all] %s\n' "$*"; }
err() { printf '\n[build_all][ERROR] %s\n' "$*" >&2; }
warn() { printf '\n[build_all][WARN] %s\n' "$*" >&2; }

if [ ! -d "$FRONTEND_DIR" ]; then
  err "Frontend directory '$FRONTEND_DIR' not found"
  exit 1
fi
if [ ! -d "$BACKEND_DIR" ]; then
  err "Backend directory '$BACKEND_DIR' not found"
  exit 1
fi

# Warn if reCAPTCHA site key not provided (unless suppressed)
if [ "${SUPPRESS_RECAPTCHA_WARN:-0}" != "1" ] && [ -z "${REACT_APP_RECAPTCHA_SITE_KEY:-}" ]; then
  warn "REACT_APP_RECAPTCHA_SITE_KEY not set – Login page reCAPTCHA widget will NOT render. Set it before build: export REACT_APP_RECAPTCHA_SITE_KEY=YOUR_SITE_KEY"
fi

log "Installing frontend dependencies ($FRONTEND_DIR)"
cd "$FRONTEND_DIR"
if [ -f package-lock.json ]; then
  npm ci || npm install
else
  npm install
fi

log "Building frontend production bundle"
npm run build

# Verify build output exists
if [ ! -d build ] || [ ! -f build/index.html ]; then
  err "Frontend build output missing (build/index.html not found)"
  exit 2
fi
log "Frontend build complete -> $(pwd)/build"

cd - >/dev/null

# NOTE: Legacy copy to backend/client/build removed.
# The backend now serves ../frontend/build directly (configs clientStaticDir).
# If you still need a duplicated copy for some external packaging, implement it
# outside this repository or add a new optional block controlled by an explicit flag.

if [ "${START_BACKEND:-0}" = "1" ]; then
  log "Installing backend dependencies ($BACKEND_DIR)"
  cd "$BACKEND_DIR"
  if [ -f package-lock.json ]; then
    npm ci || npm install
  else
    npm install
  fi
  log "Starting backend (npm start)"
  npm start
fi

log "Done."
