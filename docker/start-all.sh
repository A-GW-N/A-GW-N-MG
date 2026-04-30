#!/bin/sh
set -eu

cleanup() {
  if [ -n "${GO_PROXY_PID:-}" ] && kill -0 "$GO_PROXY_PID" 2>/dev/null; then
    kill "$GO_PROXY_PID" 2>/dev/null || true
    wait "$GO_PROXY_PID" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

/usr/local/bin/agwn-go-proxy &
GO_PROXY_PID=$!

exec node server.js
