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

# Optional: copy build output to legacy/proprietary serving path backend/client/build
# (Requested synchronization). Can be skipped via SKIP_COPY=1
if [ "${SKIP_COPY:-0}" != "1" ]; then
  LEGACY_BUILD_DIR="$BACKEND_DIR/client/build"
  log "Syncing build output to $LEGACY_BUILD_DIR"
  mkdir -p "$LEGACY_BUILD_DIR"
  # Clean target (avoid stale removed files lingering)
  rm -rf "$LEGACY_BUILD_DIR"/*
  # Copy all generated assets
  cp -a "$FRONTEND_DIR/build/." "$LEGACY_BUILD_DIR/"
  # Basic verification
  if [ ! -f "$LEGACY_BUILD_DIR/index.html" ]; then
    err "Copy failed: index.html not found in $LEGACY_BUILD_DIR"
    exit 3
  fi
  log "Legacy copy complete -> $LEGACY_BUILD_DIR"
else
  log "Skipping legacy copy step (SKIP_COPY=1)"
fi

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
