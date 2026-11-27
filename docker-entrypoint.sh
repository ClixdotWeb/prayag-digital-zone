#!/bin/sh
# Prepares the persistent volume, then starts the Next.js server.
# PRINT_RATES_FILE / PRINT_UPLOAD_DIR point into /data, which Coolify mounts as a volume.
set -e

DATA_DIR="${DATA_DIR:-/data}"
RATES_FILE="${PRINT_RATES_FILE:-$DATA_DIR/print-rates.json}"
UPLOAD_DIR="${PRINT_UPLOAD_DIR:-$DATA_DIR/uploads/print}"

mkdir -p "$(dirname "$RATES_FILE")" "$UPLOAD_DIR"

# First boot on an empty volume: seed the rate card shipped with the image.
if [ ! -f "$RATES_FILE" ] && [ -f /seed/print-rates.json ]; then
  cp /seed/print-rates.json "$RATES_FILE"
  echo "entrypoint: seeded $RATES_FILE"
fi

export PRINT_RATES_FILE="$RATES_FILE"
export PRINT_UPLOAD_DIR="$UPLOAD_DIR"

exec "$@"
