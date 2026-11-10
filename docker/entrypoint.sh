#!/bin/sh
set -eu

: "${GH_TOKEN:?Set GH_TOKEN in .env}"
: "${GATHER_WEBHOOK_URL:?Set GATHER_WEBHOOK_URL in .env}"
: "${GATHER_WEBHOOK_SECRET:?Set GATHER_WEBHOOK_SECRET in .env}"

POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-60}"
case "$POLL_INTERVAL_SECONDS" in
    ''|*[!0-9]*) echo 'POLL_INTERVAL_SECONDS must be a positive integer' >&2; exit 1 ;;
esac
if [ "$POLL_INTERVAL_SECONDS" -le 0 ]; then
    echo 'POLL_INTERVAL_SECONDS must be a positive integer' >&2
    exit 1
fi

exec node --import tsx src/index.ts \
    --url "$GATHER_WEBHOOK_URL" \
    --secret "$GATHER_WEBHOOK_SECRET" \
    --interval "$POLL_INTERVAL_SECONDS"
