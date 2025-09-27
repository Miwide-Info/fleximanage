#!/bin/bash
set -euo pipefail

# --------------------------
# Configuration parameters (adjust as needed)
# --------------------------
MONGO_VERSION="${MONGO_VERSION:-4.0.9}"        # Allow override via env
NUM_INSTANCES="${NUM_INSTANCES:-3}"            # Only need 3 for a typical dev replica set
REPLICA_SET_NAME="${REPLICA_SET_NAME:-rs}"

# Data / logs
MONGO_INSTALL_BASE="/opt"
MONGO_INSTALL_DIR="${MONGO_INSTALL_BASE}/mongodb-${MONGO_VERSION}"
DATA_BASE_DIR="${DATA_BASE_DIR:-/data/db}"     # Per-instance dir suffix appended (e.g. /data/db27017)
LOG_DIR="${LOG_DIR:-/var/log/mongodb}"

# Port span used to probe available ports (keep compact)
PORT_RANGE_START=${PORT_RANGE_START:-27017}
PORT_RANGE_END=${PORT_RANGE_END:-27029}

# Allow forcing the exact download URL (advanced)
if [[ -n "${MONGO_DOWNLOAD_URL:-}" ]]; then
  FORCE_URL=1
else
  FORCE_URL=0
fi
# --------------------------

# --------------------------
# Helper functions (logging, error handling)
# --------------------------
log() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%SZ')] $1"
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

error_exit() {
  log "ERROR: $1"
  exit 1
}

check_port_available() {
  local port=$1
  if ss -tuln | grep -q ":$port "; then
    log "Port $port is in use, trying next..."
    return 1
  fi
  return 0
}
# --------------------------

# --------------------------
# Step 1: Download and install MongoDB ${MONGO_VERSION}
# --------------------------
log "[1/7] Download phase (version=${MONGO_VERSION})..."

# Detect distro to choose correct build (OpenSSL 1.1 vs 3)
if [[ $FORCE_URL -eq 0 ]]; then
  DIST_SUFFIX=""
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    case "${VERSION_ID}" in
      18.*) DIST_SUFFIX="ubuntu1804" ;;
      20.*) DIST_SUFFIX="ubuntu2004" ;;
      22.*|23.*|24.*) DIST_SUFFIX="ubuntu2204" ;;
      *) DIST_SUFFIX="ubuntu2004" ;;
    esac
  else
    DIST_SUFFIX="ubuntu2004"
  fi
  # If user requested a very old version but running on new distro and libssl 1.1 is absent, auto bump
  if [[ "${MONGO_VERSION}" =~ ^4\.0|4\.2|4\.4|5\.0 ]] && ! ldconfig -p 2>/dev/null | grep -q 'libcrypto.so.1.1'; then
    log "Detected newer base image without libcrypto.so.1.1; auto-upgrading MongoDB version to 7.0.12 for compatibility."
    MONGO_VERSION="7.0.12"
    MONGO_INSTALL_DIR="${MONGO_INSTALL_BASE}/mongodb-${MONGO_VERSION}"
  fi
  MONGO_DOWNLOAD_URL="https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-${DIST_SUFFIX}-${MONGO_VERSION}.tgz"
fi

DOWNLOAD_PATH="/tmp/mongodb-${MONGO_VERSION}.tgz"
log "Resolved download URL: ${MONGO_DOWNLOAD_URL}"
if [ ! -f "$DOWNLOAD_PATH" ]; then
  if ! wget -qO "$DOWNLOAD_PATH" "$MONGO_DOWNLOAD_URL"; then
    error_exit "Download failed; URL invalid or network issue: $MONGO_DOWNLOAD_URL"
  fi
else
  log "Using cached archive $DOWNLOAD_PATH"
fi

log "Extracting to ${MONGO_INSTALL_DIR} ..."
sudo rm -rf "${MONGO_INSTALL_DIR}" 2>/dev/null || true
sudo mkdir -p "$MONGO_INSTALL_DIR"
sudo tar -xzf "$DOWNLOAD_PATH" -C "$MONGO_INSTALL_DIR" --strip-components=1

if [ ! -x "${MONGO_INSTALL_DIR}/bin/mongod" ]; then
  error_exit "MongoDB installation failed: mongod binary missing"
fi

# Library sanity check
if ! ldd "${MONGO_INSTALL_DIR}/bin/mongod" | grep -q 'libcrypto.so'; then
  log "WARNING: libcrypto dependency not found in ldd output; runtime may fail if OpenSSL libs are missing."
fi
# --------------------------

# --------------------------
# Step 2: Initialize data directories (with port availability checks)
# --------------------------
log "[2/7] Initializing data directories (need ${NUM_INSTANCES})..."
USED_PORTS=()
for port in $(seq $PORT_RANGE_START $PORT_RANGE_END); do
  if [ ${#USED_PORTS[@]} -ge ${NUM_INSTANCES} ]; then
    break
  fi
  if check_port_available "$port"; then
    DATA_DIR="${DATA_BASE_DIR}$port"
    sudo mkdir -p "$DATA_DIR"
    sudo chown -R mongodb:mongodb "$DATA_DIR"
    USED_PORTS+=("$port")
    log "Allocated instance port $port, data directory: $DATA_DIR"
  fi
done

if [ ${#USED_PORTS[@]} -lt ${NUM_INSTANCES} ]; then
  error_exit "Only allocated ${#USED_PORTS[@]} ports (wanted ${NUM_INSTANCES}). Adjust port range or free ports."
fi
# --------------------------

# --------------------------
# Step 3: Start MongoDB instances (container-friendly)
# --------------------------
log "[3/7] Starting MongoDB instances..."
sudo mkdir -p "$LOG_DIR"
sudo chown -R mongodb:mongodb "$LOG_DIR"

# Start all instances
TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
# Derive a conservative cache size: 25%% of RAM, min 0.25GB, max 2GB
WT_CACHE_GB=$(awk -v m="$TOTAL_MEM_KB" 'BEGIN { gb=m/1048576; c=gb*0.25; if (c<0.25) c=0.25; if (c>2) c=2; printf("%.2f",c) }')
for port in "${USED_PORTS[@]}"; do
  log "Starting instance on port $port (wiredTigerCacheSizeGB=${WT_CACHE_GB})..."
  sudo -u mongodb "${MONGO_INSTALL_DIR}/bin/mongod" \
    --port="$port" \
    --dbpath="$DATA_BASE_DIR$port" \
    --replSet="$REPLICA_SET_NAME" \
    --bind_ip_all \
    --wiredTigerCacheSizeGB "${WT_CACHE_GB}" \
    --fork \
    --logpath="$LOG_DIR/mongod-$port.log" || {
      log "mongod launch returned non-zero for port $port; tail follows:"; tail -n 25 "$LOG_DIR/mongod-$port.log" 2>/dev/null || true; error_exit "Failed to start mongod on $port"; }

  if ! pgrep -f "mongod.*--port=$port" >/dev/null 2>&1; then
    log "Start check failed; recent log tail:"; tail -n 25 "$LOG_DIR/mongod-$port.log" || true
    error_exit "Instance on port $port failed to stay up"
  fi
done
# --------------------------

# --------------------------
# Step 4: Initialize the replica set
# --------------------------
log "[4/7] Initializing replica set..."
sleep 10  # wait for instances to be up

# Build replica set configuration
if ! command -v jq >/dev/null 2>&1; then
  error_exit "jq not installed (required to build replica set JSON). Install jq or predefine REPLICA_CONFIG."
fi
REPLICA_CONFIG=$(jq -n --arg rs "$REPLICA_SET_NAME" --arg p0 "${USED_PORTS[0]}" --arg p1 "${USED_PORTS[1]}" --arg p2 "${USED_PORTS[2]}" '{ _id:$rs, members:[ { _id:0, host:("localhost:"+$p0) }, { _id:1, host:("localhost:"+$p1) }, { _id:2, host:("localhost:"+$p2) } ] }')

# Execute initiation command
log "Executing rs.initiate($REPLICA_CONFIG)"
${MONGO_INSTALL_DIR}/bin/mongo --port "${USED_PORTS[0]}" --eval "JSON.stringify(rs.initiate($REPLICA_CONFIG))" || error_exit "rs.initiate failed"
# --------------------------

# --------------------------
# Step 5: Verify replica set status
# --------------------------
log "[5/7] Verifying replica set status..."
sleep 10  # wait for replica set synchronization
STATUS=$(${MONGO_INSTALL_DIR}/bin/mongo --port "${USED_PORTS[0]}" --eval 'JSON.stringify(rs.status())')

if [[ "$STATUS" != *"\"ok\": 1"* ]]; then
  error_exit "Replica set initialization failed; status: $STATUS"
fi
# --------------------------

# --------------------------
# Step 6: Double-check primary connectivity
# --------------------------
log "[6/7] Double-checking primary node connectivity..."
success_count=0
for i in {1..15}; do
  # Use absolute path to ensure command availability
  mongo_ready=$(${MONGO_INSTALL_DIR}/bin/mongo --port "${USED_PORTS[0]}" --quiet --eval '
    try {
      db.isMaster().ismaster
    } catch (e) {
      false
    }
  ' 2>/dev/null)

  if [ "$mongo_ready" = "true" ]; then
    success_count=$((success_count+1))
    if [ "$success_count" -ge 2 ]; then
      log "MongoDB primary passed double-check and is ready."
      break
    fi
    log "Primary responded; performing secondary confirmation..."
    sleep 2
    continue
  fi

  success_count=0
  log "Primary not ready; attempt $i of 15..."
  sleep 2
done

if [ "$success_count" -lt 2 ]; then
  error_exit "Primary connectivity checks failed; cannot continue."
fi
# --------------------------

# --------------------------
# Step 7: Output success information
# --------------------------
# --------------------------
log "MongoDB ${MONGO_VERSION} replica set deployment succeeded."
log "Instance ports: ${USED_PORTS[@]}"
log "Replica set name: $REPLICA_SET_NAME"
log "Data directories: ${DATA_BASE_DIR}*"
log "Log files: $LOG_DIR/mongod-*.log"
# --------------------------
# --------------------------