#!/bin/bash
echo "[DEPRECATED WARNING] This script has been moved to scripts/install_mongodb.sh. Please invoke that path instead." >&2
set -euo pipefail

# --------------------------
# Configuration
# --------------------------
# This script is now hardcoded for MongoDB 4.0.9 as per user request.
MONGO_VERSION="4.0.9"
# Use a compatible Ubuntu version suffix for the download. 18.04 is a safe bet.
DIST_SUFFIX="ubuntu1804"

MONGO_DOWNLOAD_URL="https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-${DIST_SUFFIX}-${MONGO_VERSION}.tgz"
MONGO_INSTALL_DIR="/opt/mongodb-${MONGO_VERSION}"
DATA_BASE_DIR="/data/db"
REPLICA_SET_NAME="rs"
LOG_DIR="/var/log/mongodb"
# Use 127.0.0.1 to avoid potential IPv6 issues with 'localhost'
RS_HOST="${MONGO_HOST:-127.0.0.1}"
PORT_RANGE_START=27017
PORT_RANGE_END=27029
# Reduce the default (often very large) WiredTiger oplog allocation. Mongo 4.0 derives ~5% of free disk,
# which in container / large disk environments can create multi‑tens of GB preallocation lines like
# "creating replication oplog of size: 45310MB" (seen in logs). Keep it modest.
OPLOG_SIZE_MB=${OPLOG_SIZE_MB:-256}

# --- Action variables ---
# Allow passing KEY=VALUE arguments (e.g. "CLEAN=1 ./install_mongodb.sh")
for arg in "$@"; do
  if [[ "$arg" == *=* ]]; then
    key="${arg%%=*}"
    val="${arg#*=}"
    export "$key"="$val"
  fi
done

# Set defaults for actions
CLEAN=${CLEAN:-0}
STOP=${STOP:-0}
STATUS=${STATUS:-0}
# Hardcode MAX_INSTANCES for a 3-node replica set as requested
MAX_INSTANCES=3

# Mutual exclusion check for STOP and CLEAN
if [[ "$STOP" = "1" && "$CLEAN" = "1" ]]; then
  echo "ERROR: STOP=1 and CLEAN=1 cannot be used together." >&2
  exit 1
fi

# --------------------------
# Helper Functions
# --------------------------
log() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%SZ')] $1"
}

error_exit() {
  log "ERROR: $1"
  exit 1
}

# Return the numeric myState for the given port or -1 on error.
# MongoDB myState codes: 0 STARTUP, 1 PRIMARY, 2 SECONDARY, 3 RECOVERING, 5 STARTUP2,
# 6 UNKNOWN, 7 ARBITER, 8 DOWN, 9 ROLLBACK, 10 REMOVED
mongo_my_state() {
  local port="$1"
  # We purposefully avoid JSON.stringify formatting (which removed spaces and broke earlier grep logic)
  # and instead extract just the numeric myState value. Any error returns -1.
  "$MONGO_BIN" --port "$port" --quiet --eval 'try { var s = rs.status(); s.myState } catch(e) { -1 }' 2>/dev/null || echo "-1"
}

# Ensure mongodb user/group exists
if ! getent group mongodb >/dev/null; then
  log "Creating group 'mongodb'..."
  sudo groupadd mongodb
fi
if ! id -u mongodb >/dev/null 2>&1; then
  log "Creating user 'mongodb'..."
  sudo useradd -r -g mongodb -s /bin/false mongodb
fi

# --- Pre-flight checks & early exits ---

# STOP mode
if [ "$STOP" = "1" ]; then
  log "STOP=1: Attempting graceful shutdown of mongod processes..."
  pids=$(pgrep -f "mongod.*--port=270" || true)
  if [ -z "$pids" ]; then
    log "No mongod processes found. Nothing to stop."
    exit 0
  fi
  log "Sending SIGTERM to mongod PIDs: $pids"
  sudo kill $pids 2>/dev/null || true
  sleep 2
  # Force kill any remaining
  pids=$(pgrep -f "mongod.*--port=270" || true)
  if [ -n "$pids" ]; then
    log "Force killing remaining mongod PIDs: $pids"
    sudo kill -9 $pids 2>/dev/null || true
  fi
  log "All mongod processes stopped."
  exit 0
fi

# STATUS mode
if [ "$STATUS" = "1" ]; then
  log "STATUS=1: Checking mongod instances..."
  MONGO_BIN="/opt/mongodb-current/bin/mongo"
  if [ ! -f "$MONGO_BIN" ]; then
     # Fallback to check just processes if main install not done
     pgrep -afl "mongod" || log "No mongod processes running."
     exit 0
  fi
  for port in $(seq $PORT_RANGE_START $PORT_RANGE_END); do
    if pgrep -f "mongod.*--port=$port" >/dev/null; then
      state=$(mongo_my_state "$port")
      case "$state" in
        1) role="PRIMARY";;
        2) role="SECONDARY";;
        0|3|5) role="STARTING (myState=$state)";;
        7) role="ARBITER";;
        8) role="DOWN";;
        9) role="ROLLBACK";;
        10) role="REMOVED";;
        -1) role="RUNNING (status error)";;
        *) role="RUNNING (unknown myState=$state)";;
      esac
      log "Instance on port $port: $role"
    else
      log "Instance on port $port: STOPPED"
    fi
  done
  exit 0
fi

# --------------------------
# Main Installation
# --------------------------
log "[1/7] Preparing environment for MongoDB ${MONGO_VERSION}"

# Install libssl1.1, which is required by MongoDB 4.0.9 on modern Ubuntu
if ! dpkg-query -W -f='${Status}' libssl1.1:amd64 2>/dev/null | grep -q "install ok installed"; then
    log "libssl1.1 not found or not fully installed. Attempting to install it..."
    if ! wget -qO /tmp/libssl1.1.deb http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb; then
        error_exit "Failed to download libssl1.1. Please install it manually."
    fi
    sudo dpkg -i /tmp/libssl1.1.deb
    # Verify installation
    if ! dpkg-query -W -f='${Status}' libssl1.1:amd64 2>/dev/null | grep -q "install ok installed"; then
        error_exit "libssl1.1 installation failed. Please check the errors above."
    fi
    log "libssl1.1 installed successfully."
fi

# CLEAN mode: stop and remove all old data
if [ "$CLEAN" = "1" ]; then
    log "CLEAN=1: Stopping all mongod processes and removing old data..."
    pids=$(pgrep -f "mongod" || true)
    if [ -n "$pids" ]; then
        log "Stopping PIDs: $pids"
        # Use kill -9 on the specific PIDs found
        echo "$pids" | xargs sudo kill -9 2>/dev/null || true
    fi

    # Wait for ports to be released
    log "Waiting for ports to become free..."
    for i in {1..10}; do
        ports_in_use=()
        for port in $(seq $PORT_RANGE_START $PORT_RANGE_END); do
            if ss -tuln | grep -q ":$port "; then
                ports_in_use+=("$port")
            fi
        done
        if [ ${#ports_in_use[@]} -eq 0 ]; then
            log "Ports are free."
            break
        fi
        log "Ports still in use: ${ports_in_use[*]}. Waiting... ($i/10)"
        sleep 1
    done

    if [ ${#ports_in_use[@]} -ne 0 ]; then
        error_exit "Failed to free up ports: ${ports_in_use[*]}. Please stop the processes manually."
    fi

    log "Removing old data directories..."
    sudo rm -rf /data/db270*
fi

log "[2/7] Downloading MongoDB ${MONGO_VERSION}..."
DOWNLOAD_PATH="/tmp/mongodb-${MONGO_VERSION}.tgz"
if [ ! -f "$DOWNLOAD_PATH" ]; then
  if ! wget -qO "$DOWNLOAD_PATH" "$MONGO_DOWNLOAD_URL"; then
    error_exit "Download failed; please check URL: $MONGO_DOWNLOAD_URL"
  fi
fi

log "[3/7] Extracting archive to ${MONGO_INSTALL_DIR}..."
sudo mkdir -p "$MONGO_INSTALL_DIR"
sudo tar -xzf "$DOWNLOAD_PATH" -C "$MONGO_INSTALL_DIR" --strip-components=1
sudo ln -sfn "${MONGO_INSTALL_DIR}" /opt/mongodb-current
MONGO_BIN="/opt/mongodb-current/bin/mongo"

log "[4/7] Initializing data directories..."
USED_PORTS=()
for port in $(seq $PORT_RANGE_START $PORT_RANGE_END); do
  # Stop if we have enough instances
  if [ ${#USED_PORTS[@]} -ge $MAX_INSTANCES ]; then
    break
  fi

  if pgrep -f "mongod.*--port=$port" >/dev/null; then
      error_exit "Port $port is already in use. Please run with CLEAN=1 or stop the process manually."
  fi
  DATA_DIR="${DATA_BASE_DIR}$port"
  log "Creating data directory: $DATA_DIR"
  sudo mkdir -p "$DATA_DIR"
  sudo chown -R mongodb:mongodb "$DATA_DIR"
  USED_PORTS+=("$port")
done

if [ ${#USED_PORTS[@]} -ne $MAX_INSTANCES ]; then
  error_exit "Failed to prepare directories for $MAX_INSTANCES instances."
fi

log "[5/7] Starting $MAX_INSTANCES MongoDB instances..."
sudo mkdir -p "$LOG_DIR"
sudo chown -R mongodb:mongodb "$LOG_DIR"

for port in "${USED_PORTS[@]}"; do
  log "Starting instance on port $port..."
  sudo -u mongodb "/opt/mongodb-current/bin/mongod" \
    --port="$port" \
    --dbpath="$DATA_BASE_DIR$port" \
    --replSet="$REPLICA_SET_NAME" \
    --bind_ip_all \
    --oplogSize $OPLOG_SIZE_MB \
    --wiredTigerCacheSizeGB 0.25 \
    --fork \
    --logpath="$LOG_DIR/mongod-$port.log"
  sleep 1
  if ! pgrep -f "mongod.*--port=$port" >/dev/null; then
    error_exit "Instance on port $port failed to start. Check log: $LOG_DIR/mongod-$port.log"
  fi
done

log "[6/7] Initializing replica set..."
sleep 8 # Wait for instances to be ready

# Build replica set configuration using legacy mongo shell syntax
# NOTE: Previously this line contained literal "\n" escape sequences (backslashes not inside a string).
# Mongo shell treated them as illegal characters while parsing the object literal, producing: SyntaxError: illegal character.
# They must be removed so the config is a single-line JS object literal.
REPLICA_CONFIG="{ _id: \"${REPLICA_SET_NAME}\", members: [ { _id: 0, host: \"${RS_HOST}:${USED_PORTS[0]}\" }, { _id: 1, host: \"${RS_HOST}:${USED_PORTS[1]}\" }, { _id: 2, host: \"${RS_HOST}:${USED_PORTS[2]}\" } ] }"

# If the replica set is already initialized (rerun without CLEAN), avoid re-running rs.initiate and spurious errors.
existing_status=$($MONGO_BIN --port "${USED_PORTS[0]}" --quiet --eval 'try { s=rs.status(); printjson(s) } catch(e){ print("RS_STATUS_ERROR") }' 2>/dev/null || true)
if echo "$existing_status" | grep -q '"ok"[[:space:]]*:[[:space:]]*1' && echo "$existing_status" | grep -q '"myState"' ; then
  if echo "$existing_status" | grep -q '"myState"[[:space:]]*:[[:space:]]*1'; then
    log "Replica set already initialized and PRIMARY is present. Skipping rs.initiate()."
  else
    log "Replica set already initialized (no need to re-init). Current rs.status():"
    echo "$existing_status"
  fi
else
  log "Executing rs.initiate() on port ${USED_PORTS[0]}..."
  log "Replica set config being used: $REPLICA_CONFIG"
  log "--- Mongo Shell Output START ---"
  set -x
  $MONGO_BIN --port "${USED_PORTS[0]}" --eval "rs.initiate($REPLICA_CONFIG)" || true
  MONGO_EXIT_CODE=$?
  set +x
  log "--- Mongo Shell Output END ---"
  # Handle AlreadyInitialized (code 23) case
  if [ $MONGO_EXIT_CODE -ne 0 ]; then
  # Try to determine whether it's simply already initialized
    if $MONGO_BIN --port "${USED_PORTS[0]}" --quiet --eval 'try{c=rs.status();print(c.ok)}catch(e){print(0)}' 2>/dev/null | grep -q '^1$'; then
      log "rs.initiate returned non-zero but replica set appears healthy (likely AlreadyInitialized). Continuing."
    else
      error_exit "rs.initiate failed (exit $MONGO_EXIT_CODE) and rs.status() not healthy."
    fi
  fi
  log "rs.initiate() command processed."
fi
init_check_output=$($MONGO_BIN --port "${USED_PORTS[0]}" --quiet --eval "rs.status()" 2>&1)
if ! echo "$init_check_output" | grep -q -E '"ok"\s*:\s*1'; then
  log "WARNING: rs.status() did not return ok:1 after initiation / detection. Output:"
  echo "$init_check_output"
fi

log "[7/7] Waiting for a PRIMARY member..."
primary_ok=0
# Extend waiting window to ~120 seconds (60 attempts * 2s) for slow / constrained environments
for i in {1..60}; do
  state=$(mongo_my_state "${USED_PORTS[0]}")
  if [ "$state" = "1" ]; then
    primary_ok=1
    log "Primary is ready on attempt $i (myState=$state)."
    break
  fi
  log "Primary not ready yet (attempt $i/60, myState=$state)..."
  sleep 2
done

if [ "$primary_ok" != "1" ]; then
  log "WARNING: Primary member not confirmed within 120 seconds. Possible causes: 1) Extra mongod processes 2) Hostname mismatch 3) Insufficient resources."
  log "Troubleshooting suggestions:"
  log "  sudo pgrep -af mongod"
  log "  sudo tail -n 40 /var/log/mongodb/mongod-${USED_PORTS[0]}.log"
  log "  ${MONGO_BIN} --port ${USED_PORTS[0]} --eval 'rs.status()'"
fi

log "---"
log "MongoDB 4.0.9 replica set deployment finished."
log "Instances: ${USED_PORTS[*]}"
log "Replica Set: $REPLICA_SET_NAME"
log "Data Dirs: ${DATA_BASE_DIR}2701*"
log "Logs: $LOG_DIR/mongod-*.log"
log "---"
log "To check status, run: bash $0 STATUS=1"
log "To stop all, run: bash $0 STOP=1"

# ------------------------------------------------------------
# IMPORTANT: Prevent executing the duplicate legacy workflow
# that appears later in this file (was causing a second set of
# mongod processes on ports 27020+ to start, interfering with
# election). We exit cleanly here.
# ------------------------------------------------------------
exit 0