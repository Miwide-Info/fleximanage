# Maintenance & Helper Scripts

This directory contains one-off or low-frequency operational scripts. They are intentionally
decoupled from the backend runtime so they can be invoked without altering application code.

## Location
All maintenance scripts live under `scripts/maintenance/`.

## Scripts

### promote-user-admin.js
Promote or demote a user to/from admin (super admin flag) directly in MongoDB.

Usage:

```bash
node scripts/maintenance/promote-user-admin.js user@example.com        # promote
node scripts/maintenance/promote-user-admin.js --demote user@example.com  # demote
```

Notes:
- Resolves backend config & models dynamically.
- Exits non‑zero on error or if user not found.

### check-admin-status.js
Check admin flag for one or more users.

Usage:

```bash
node scripts/maintenance/check-admin-status.js alice@example.com bob@example.com
```

Outputs lines like:
```
alice@example.com: admin = YES
bob@example.com: admin = NO
```

## Contributing New Scripts
1. Place the script in `scripts/maintenance/`.
2. Reuse backend modules via dynamic `require(path.join(backendRoot, ...))` instead of duplicating logic.
3. Avoid committing secrets or embedding credentials; rely on existing config resolution.
4. Prefer descriptive console output and non‑zero exit codes on failure.

## Version Control Policy
Runtime or generated artifacts (logs, build outputs) must not be added here. Only source scripts and documentation.

## License
Scripts inherit the repository license unless explicitly stated otherwise.
# Development Helper Scripts

This directory contains convenience shell scripts to quickly provision local development dependencies (MongoDB replica set, Redis, test SMTP server). **They are NOT production‑hardened**. Use them to bootstrap a dev/test workstation or disposable lab environment.

## Contents

| Script | Purpose | Key Flags / Params |
|--------|---------|--------------------|
| `install_mongodb.sh` | Install & launch MongoDB 4.0.9 as a 3 member replica set on ports 27017/27018/27019 | `STATUS=1` show roles; `STOP=1` stop processes; `CLEAN=1` wipe data & restart; `OPLOG_SIZE_MB=256` override oplog size |
| `install_redis.sh` | Install & configure Redis (systemd or sysv) on port 6379 | (none yet – future: `REDIS_PASSWORD=...`) |
| `install_aiosmtpd.sh` | Lightweight SMTP sink on port 1025 using `aiosmtpd` (captures & logs emails) | `UNINSTALL=1`, `REINSTALL=1`, `UPGRADE=1`, `AIOSMTPD_VERSION=x.y.z`, `PORT=1025` |
| `build_all.sh` | Build frontend (React) then (optionally) start backend | `START_BACKEND=1` also runs backend after build |

## Quick Start

```bash
# MongoDB 3-node replica set
sudo ./scripts/install_mongodb.sh
sudo ./scripts/install_mongodb.sh STATUS=1

# Redis
sudo ./scripts/install_redis.sh

# SMTP test server (Mail sink)
sudo ./scripts/install_aiosmtpd.sh
```

## MongoDB Script Details

Hard‑pinned to version 4.0.9 (matching project requirements). Creates three data directories:

```
/data/db27017
/data/db27018
/data/db27019
```

Replica set name: `rs` (hosts all bound to 127.0.0.1). Logs under `/var/log/mongodb/mongod-<port>.log`.

Flags / Environment (pass as `KEY=VALUE` before or after script name):

| Key | Default | Description |
|-----|---------|-------------|
| `CLEAN` | `0` | If `1`, stops any running instances and removes existing data dirs before reinstall/start |
| `STOP` | `0` | If `1`, attempts a graceful then forced shutdown of all `mongod` processes in the managed port range |
| `STATUS` | `0` | If `1`, prints role/state per port |
| `OPLOG_SIZE_MB` | `256` | Size of each member's oplog (smaller than the very large default allocation) |

Order of precedence: explicit `KEY=VALUE` arguments override environment exports; defaults apply last.

## Redis Script Details

Uses distribution packages (apt / yum / dnf). Generates a minimal config file at `/etc/redis/redis.conf` with:

* Port: 6379
* Bind: 0.0.0.0 (adjust if you want stricter exposure)
* `maxmemory 256mb` & `allkeys-lru` eviction (tunable)
* AOF enabled for durability (`appendonly yes`)
* Simple ACL example user line for reference

Systemd environments: runs foreground (daemonize=no) and leverages the native unit. SysV: installs an `/etc/init.d/redis-server` script with start/stop/restart/status.

Planned future optional enhancements (open to PRs):

* `REDIS_PASSWORD` / `requirepass` injection
* `MAXMEMORY_MB` override
* Optional sentinel or cluster scaffolding

## aiosmtpd Script Details

Creates a dedicated system user/group `aiosmtpd`, Python virtualenv under `/opt/aiosmtpd_server/venv`, installs latest (or pinned) `aiosmtpd`, and runs a small Python handler that logs metadata + first 100 bytes of each message. Intended purely as a development mail sink.

Flags:

| Flag / Key | Meaning |
|------------|---------|
| `UNINSTALL=1` | Stop service (systemd or init.d) and remove install directory (logs retained) |
| `REINSTALL=1` | Delete existing virtualenv and reinstall clean |
| `UPGRADE=1` | `pip install --upgrade` aiosmtpd inside the existing virtualenv |
| `AIOSMTPD_VERSION=x.y.z` | Pin to a specific version instead of latest |
| `PORT=1025` | (Future) Intended for port override (Python script currently fixed to 1025; override support can be added) |

## General Safety & Production Notes

These scripts intentionally:

* Use relaxed network binds (Mongo binds all interfaces; Redis binds 0.0.0.0) for local lab flexibility.
* Skip authentication, TLS, resource hardening, and backup rotation.
* Assume a non-hosted, single-user development environment.

Do NOT deploy them as-is on Internet‑reachable hosts or shared corporate servers. For production you should address:

1. Authentication / access controls (Redis ACLs, Mongo users & keyFile / x.509)  
2. TLS encryption  
3. Data backup strategy  
4. Resource sizing (memory, cache, storage IOPS)  
5. Monitoring & alerting (Prometheus exporters, log shipping)  
6. Least‑privilege service accounts + SELinux/AppArmor (where applicable)  

## Troubleshooting Tips

| Symptom | Check |
|---------|-------|
| Mongo primary never elects | Extra stray `mongod`? Hostname mismatch? Disk slow? Review first lines of each `mongod-*.log`. |
| Redis not listening | `ss -tuln | grep 6379`; confirm systemd vs sysv path; inspect `/var/log/redis/redis-server.log`. |
| aiosmtpd port busy | `ss -tuln | grep :1025`; adjust or free the port; rerun with clean install. |
| Permission denied writing logs | Ensure `logs` dir ownership matches service user (e.g. `chown aiosmtpd:aiosmtpd /fleximanage/logs`). |

## Contributing Improvements

Pull requests welcome for:

* Additional parameterization (passwords, ports, memory constraints)
* Optional security hardening switches (e.g. `MONGO_AUTH=1`)
* Unified status aggregation script
* ShellCheck cleanup & CI integration

Keep scripts POSIX‑lean where practical, but `bash` is already assumed.

---
_Last updated: $(date -u +%Y-%m-%d 2>/dev/null || echo 2025-09-28)_
