#!/bin/bash
set -euo pipefail

# --------------------------
# Configuration parameters (adjust as needed)
# --------------------------
MONGO_VERSION="4.0.9"
MONGO_DOWNLOAD_URL="https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu1804-${MONGO_VERSION}.tgz"
MONGO_INSTALL_DIR="/opt/mongodb-${MONGO_VERSION}"
# Base data directory (per-instance subdirs will be created, e.g. /data/db27017)
DATA_BASE_DIR="/data/db"
REPLICA_SET_NAME="rs"            # Replica set name
LOG_DIR="/var/log/mongodb"       # Log directory
PORT_RANGE_START=27017            # Port range start (must be defined)
PORT_RANGE_END=27029              # Port range end (must be defined)
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
log "[1/7] Downloading MongoDB ${MONGO_VERSION}..."
DOWNLOAD_PATH="/tmp/mongodb-${MONGO_VERSION}.tgz"
if [ ! -f "$DOWNLOAD_PATH" ]; then
  if ! wget -qO "$DOWNLOAD_PATH" "$MONGO_DOWNLOAD_URL"; then
    error_exit "Download failed; please check the URL: $MONGO_DOWNLOAD_URL"
  fi
fi

log "Extracting archive to ${MONGO_INSTALL_DIR}..."
sudo mkdir -p "$MONGO_INSTALL_DIR"
sudo tar -xzf "$DOWNLOAD_PATH" -C "$MONGO_INSTALL_DIR" --strip-components=1

# Verify installation files
if [ ! -f "${MONGO_INSTALL_DIR}/bin/mongod" ]; then
  error_exit "MongoDB installation failed: mongod binary not found"
fi
# --------------------------

# --------------------------
# Step 2: Initialize data directories (with port availability checks)
# --------------------------
log "[2/7] Initializing data directories..."
USED_PORTS=()  # record allocated ports

# Allocate available ports in the configured range
for port in $(seq $PORT_RANGE_START $PORT_RANGE_END); do
  if check_port_available "$port"; then
    DATA_DIR="${DATA_BASE_DIR}$port"
    sudo mkdir -p "$DATA_DIR"
    sudo chown -R mongodb:mongodb "$DATA_DIR"
    USED_PORTS+=("$port")
    log "Allocated instance port $port, data directory: $DATA_DIR"
  fi
done

# Verify we have at least 3 available ports
if [ ${#USED_PORTS[@]} -lt 3 ]; then
  error_exit "Only found ${#USED_PORTS[@]} available ports; at least 3 are required (e.g. 27017-27019)"
fi
# --------------------------

# --------------------------
# Step 3: Start MongoDB instances (container-friendly)
# --------------------------
log "[3/7] Starting MongoDB instances..."
sudo mkdir -p "$LOG_DIR"
sudo chown -R mongodb:mongodb "$LOG_DIR"

# Start all instances
for port in "${USED_PORTS[@]}"; do
  log "Starting instance on port $port..."
  sudo -u mongodb "${MONGO_INSTALL_DIR}/bin/mongod" \
    --port="$port" \
    --dbpath="$DATA_BASE_DIR$port" \
    --replSet="$REPLICA_SET_NAME" \
    --bind_ip_all \
    --wiredTigerCacheSizeGB $(( ($(grep MemTotal /proc/meminfo | awk '{print $2}') * 1024) / 2048 / 1024 )) \
    --fork \
    --logpath="$LOG_DIR/mongod-$port.log"

  # Verify the process started
  if ! pgrep -f "mongod.*--port=$port" &>/dev/null; then
    error_exit "Instance on port $port failed to start; check log: $LOG_DIR/mongod-$port.log"
  fi
done
# --------------------------

# --------------------------
# Step 4: Initialize the replica set
# --------------------------
log "[4/7] Initializing replica set..."
sleep 10  # wait for instances to be up

# Build replica set configuration
REPLICA_CONFIG=$(jq -n \
  '{
    _id: "'"$REPLICA_SET_NAME"'",
    members: [
      { _id: 0, host: "localhost:'"${USED_PORTS[0]}"'" },
      { _id: 1, host: "localhost:'"${USED_PORTS[1]}"'" },
      { _id: 2, host: "localhost:'"${USED_PORTS[2]}"'" }
    ]
  }')

# Execute initiation command
log "Executing rs.initiate($REPLICA_CONFIG)"
${MONGO_INSTALL_DIR}/bin/mongo --port "${USED_PORTS[0]}" --eval "JSON.stringify(rs.initiate($REPLICA_CONFIG))"
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