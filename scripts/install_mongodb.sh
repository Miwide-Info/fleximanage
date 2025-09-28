#!/bin/bash
# Wrapper that sources the original script (moved). Keeping content identical for now.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
exec "$ROOT_DIR/install_mongodb.sh" "$@"
