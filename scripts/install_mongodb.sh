#!/bin/bash
set -euo pipefail

# MongoDB 4.0.9 Replica Set Helper (3-node) -- canonical location scripts/install_mongodb.sh

MONGO_VERSION="4.0.9"
DIST_SUFFIX="ubuntu1804"
MONGO_DOWNLOAD_URL="https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-${DIST_SUFFIX}-${MONGO_VERSION}.tgz"
MONGO_INSTALL_DIR="/opt/mongodb-${MONGO_VERSION}"
DATA_BASE_DIR="/data/db"
REPLICA_SET_NAME="rs"
LOG_DIR="/var/log/mongodb"
RS_HOST="${MONGO_HOST:-127.0.0.1}"
PORT_RANGE_START=27017
PORT_RANGE_END=27029
OPLOG_SIZE_MB=${OPLOG_SIZE_MB:-256}

for arg in "$@"; do [[ "$arg" == *=* ]] && key="${arg%%=*}" && val="${arg#*=}" && export "$key"="$val"; done

CLEAN=${CLEAN:-0}
STOP=${STOP:-0}
STATUS=${STATUS:-0}
MAX_INSTANCES=3

log(){ echo "[$(date +'%Y-%m-%dT%H:%M:%SZ')] $*"; }
error_exit(){ log "ERROR: $1"; exit 1; }

mongo_my_state(){
	local port="$1"
	"/opt/mongodb-current/bin/mongo" --port "$port" --quiet --eval 'try { var s = rs.status(); s.myState } catch(e) { -1 }' 2>/dev/null || echo -1
}

if [[ "$STOP" == 1 && "$CLEAN" == 1 ]]; then echo "ERROR: STOP=1 and CLEAN=1 cannot be combined" >&2; exit 1; fi

if [[ "$STOP" == 1 ]]; then
	log "STOP=1: stopping mongod processes"
	pids=$(pgrep -f "mongod.*--port=270" || true)
	if [[ -z "$pids" ]]; then log "No mongod processes"; exit 0; fi
	kill $pids 2>/dev/null || true; sleep 2
	leftover=$(pgrep -f "mongod.*--port=270" || true)
	[[ -n "$leftover" ]] && kill -9 $leftover 2>/dev/null || true
	log "Stopped."; exit 0
fi

if [[ "$STATUS" == 1 ]]; then
	log "STATUS=1"
	MONGO_BIN="/opt/mongodb-current/bin/mongo"
	if [[ ! -f "$MONGO_BIN" ]]; then pgrep -afl mongod || log "No mongod processes"; exit 0; fi
	for port in $(seq $PORT_RANGE_START $PORT_RANGE_END); do
		if pgrep -f "mongod.*--port=$port" >/dev/null; then
			state=$(mongo_my_state "$port")
			case "$state" in
				1) role=PRIMARY;; 2) role=SECONDARY;; 0|3|5) role=STARTING;; 7) role=ARBITER;; 8) role=DOWN;; 9) role=ROLLBACK;; 10) role=REMOVED;; -1) role=RUNNING_ERR;; *) role=UNKNOWN_$state;;
			esac
			log "Port $port: $role"
		else
			log "Port $port: STOPPED"
		fi
	done; exit 0
fi

log "[1/7] Preparing environment for MongoDB ${MONGO_VERSION}"

if ! dpkg-query -W -f='${Status}' libssl1.1:amd64 2>/dev/null | grep -q "install ok installed"; then
	log "Installing libssl1.1 dependency"
	wget -qO /tmp/libssl1.1.deb http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb || error_exit "Download libssl1.1 failed"
	dpkg -i /tmp/libssl1.1.deb
	dpkg-query -W -f='${Status}' libssl1.1:amd64 2>/dev/null | grep -q "install ok installed" || error_exit "libssl1.1 install failed"
fi

if [[ "$CLEAN" == 1 ]]; then
	log "CLEAN=1 removing old processes & data"
	pids=$(pgrep -f mongod || true)
	[[ -n "$pids" ]] && kill -9 $pids 2>/dev/null || true
	for i in {1..10}; do
		busy=0; for port in $(seq $PORT_RANGE_START $PORT_RANGE_END); do ss -tuln | grep -q ":$port " && busy=1; done
		[[ $busy -eq 0 ]] && break; sleep 1
	done
	rm -rf /data/db270* || true
fi

log "[2/7] Downloading MongoDB ${MONGO_VERSION}"
DOWNLOAD_PATH="/tmp/mongodb-${MONGO_VERSION}.tgz"
[[ -f "$DOWNLOAD_PATH" ]] || wget -qO "$DOWNLOAD_PATH" "$MONGO_DOWNLOAD_URL" || error_exit "Download failed"

log "[3/7] Extracting"
mkdir -p "$MONGO_INSTALL_DIR" ; tar -xzf "$DOWNLOAD_PATH" -C "$MONGO_INSTALL_DIR" --strip-components=1
ln -sfn "$MONGO_INSTALL_DIR" /opt/mongodb-current
MONGO_BIN="/opt/mongodb-current/bin/mongo"

log "[4/7] Creating data dirs"
USED_PORTS=()
for port in $(seq $PORT_RANGE_START $PORT_RANGE_END); do
	[[ ${#USED_PORTS[@]} -ge $MAX_INSTANCES ]] && break
	if pgrep -f "mongod.*--port=$port" >/dev/null; then error_exit "Port $port in use (use CLEAN=1)"; fi
	d="${DATA_BASE_DIR}$port"; mkdir -p "$d"; USED_PORTS+=("$port")
done
[[ ${#USED_PORTS[@]} -eq $MAX_INSTANCES ]] || error_exit "Failed to allocate $MAX_INSTANCES ports"
chown -R mongodb:mongodb "$DATA_BASE_DIR"270* 2>/dev/null || true

log "[5/7] Starting instances"
mkdir -p "$LOG_DIR"; chown -R mongodb:mongodb "$LOG_DIR"
for port in "${USED_PORTS[@]}"; do
	log "Starting port $port"
	sudo -u mongodb /opt/mongodb-current/bin/mongod --port "$port" --dbpath "${DATA_BASE_DIR}$port" --replSet "$REPLICA_SET_NAME" --bind_ip_all --oplogSize $OPLOG_SIZE_MB --wiredTigerCacheSizeGB 0.25 --fork --logpath "$LOG_DIR/mongod-$port.log"
	sleep 1; pgrep -f "mongod.*--port=$port" >/dev/null || error_exit "Instance $port failed (see $LOG_DIR/mongod-$port.log)"
done

log "[6/7] Replica set init"
sleep 8
REPLICA_CONFIG="{ _id: \"${REPLICA_SET_NAME}\", members: [ { _id: 0, host: \"${RS_HOST}:${USED_PORTS[0]}\" }, { _id: 1, host: \"${RS_HOST}:${USED_PORTS[1]}\" }, { _id: 2, host: \"${RS_HOST}:${USED_PORTS[2]}\" } ] }"
existing_status=$($MONGO_BIN --port "${USED_PORTS[0]}" --quiet --eval 'try { s=rs.status(); printjson(s) } catch(e){ print("RS_STATUS_ERROR") }' 2>/dev/null || true)
if echo "$existing_status" | grep -q '"ok"[[:space:]]*:[[:space:]]*1' && echo "$existing_status" | grep -q '"myState"'; then
	if echo "$existing_status" | grep -q '"myState"[[:space:]]*:[[:space:]]*1'; then
		log "Replica set already initialized (PRIMARY present)"
	else
		log "Replica set initialized (no init needed)"
	fi
else
	log "Running rs.initiate()"
	$MONGO_BIN --port "${USED_PORTS[0]}" --eval "rs.initiate($REPLICA_CONFIG)" || true
fi
init_check=$($MONGO_BIN --port "${USED_PORTS[0]}" --quiet --eval 'rs.status()' 2>&1 || true)
echo "$init_check" | grep -q -E '"ok"\s*:\s*1' || log "WARNING: rs.status() not ok:1"

log "[7/7] Wait for PRIMARY"
primary_ok=0
for i in {1..60}; do
	state=$(mongo_my_state "${USED_PORTS[0]}")
	[[ "$state" == 1 ]] && primary_ok=1 && log "PRIMARY ready attempt $i" && break
	sleep 2
done
[[ $primary_ok -eq 1 ]] || log "WARNING: PRIMARY not ready after wait"

log "---"
log "MongoDB ${MONGO_VERSION} replica set deployed. Ports: ${USED_PORTS[*]}"
log "Replica Set: $REPLICA_SET_NAME"
log "Logs: $LOG_DIR/mongod-*.log"
log "Use: bash $0 STATUS=1 | STOP=1 | CLEAN=1"
exit 0
