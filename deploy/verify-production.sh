#!/usr/bin/env bash
# Read-only verification after copying systemd/nginx files and reloading them.
set -euo pipefail

errors=0
ok() { printf '✓ %s\n' "$1"; }
bad() { printf '✖ %s\n' "$1" >&2; errors=$((errors + 1)); }

systemd-analyze verify /etc/systemd/system/nirooxen.service \
  /etc/systemd/system/nirooxen-backup.service \
  /etc/systemd/system/nirooxen-backup.timer >/dev/null \
  && ok "systemd units are valid" \
  || bad "systemd unit validation failed"

nginx_dump="$(mktemp)"
trap 'rm -f "$nginx_dump"' EXIT
if nginx -T >"$nginx_dump" 2>&1; then
  ok "nginx configuration is valid"
else
  cat "$nginx_dump" >&2
  bad "nginx validation failed"
fi

grep -Fq 'map $http_upgrade $connection_upgrade' "$nginx_dump" \
  && ok "WebSocket connection map is active" \
  || bad "WebSocket connection map is missing"
grep -Fq 'proxy_set_header Connection        $connection_upgrade;' "$nginx_dump" \
  && ok "Connection header is conditional" \
  || bad "Connection header is still forced to upgrade"
grep -Eq 'limit_req zone=nirooxen_app burst=120 nodelay;' "$nginx_dump" \
  && ok "NAT-friendly nginx burst is active" \
  || bad "expected nginx burst=120 is not active"

if [[ -f /etc/nirooxen/nirooxen.env ]]; then
  mode="$(stat -c '%a' /etc/nirooxen/nirooxen.env)"
  owner="$(stat -c '%U:%G' /etc/nirooxen/nirooxen.env)"
  [[ "$mode" == "600" && "$owner" == "root:root" ]] \
    && ok "environment file is root:root mode 600" \
    || bad "environment file must be root:root mode 600 (found $owner mode $mode)"
else
  bad "/etc/nirooxen/nirooxen.env is missing"
fi

systemctl is-enabled --quiet nirooxen.service \
  && ok "application service is enabled" \
  || bad "application service is not enabled"
systemctl is-enabled --quiet nirooxen-backup.timer \
  && ok "backup timer is enabled" \
  || bad "backup timer is not enabled"

if (( errors > 0 )); then
  printf '\n%d production verification check(s) failed.\n' "$errors" >&2
  exit 1
fi

printf '\nProduction configuration passed all checks.\n'
