#!/bin/bash
set -euo pipefail

banner() { echo "==== $1 ===="; }

banner "ENV"
date
whoami || true
echo "PWD=$PWD"

banner "PROCESS CHECK"
echo "-- aiosmtpd --"
pgrep -fl aiosmtpd || echo "(no aiosmtpd process)"
echo "-- redis --"
pgrep -fl redis-server || echo "(no redis-server process)"
echo "-- mongod --"
pgrep -fl mongod || echo "(no mongod process)"

banner "PORTS (ss)"
if command -v ss >/dev/null 2>&1; then
  ss -tuln | awk '/:(1025|2525|6379|27017|27018|27019) /'
else
  echo "ss not available"
fi

banner "REDIS"
if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli -p 6379 ping 2>/dev/null | grep -q PONG; then
    echo "redis ping: PONG"
  else
    echo "redis ping: FAIL (port 6379 not responding)"
  fi
else
  echo "redis-cli not installed"
fi

banner "MONGODB"
if command -v mongosh >/dev/null 2>&1; then
  mongosh --quiet --port 27017 --eval 'try{h=db.hello();printjson({isWritablePrimary:h.isWritablePrimary,secondary:h.secondary,hosts:h.hosts,ok:1})}catch(e){print("hello_error")}' 2>/dev/null || echo "hello_error"
else
  echo "mongosh not installed"
fi

banner "SYSTEMD SERVICES (if systemctl exists)"
if command -v systemctl >/dev/null 2>&1; then
  for svc in redis redis-server mongod mongodb aiosmtpd; do
    systemctl is-active --quiet "$svc" && echo "$svc: active" || echo "$svc: inactive"
  done
else
  echo "systemctl not present (likely container / minimal env)"
fi

banner "DONE"
