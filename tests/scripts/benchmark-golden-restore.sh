#!/usr/bin/env bash
# Benchmark API integration slices for golden snapshot restore comparisons.
# Usage: ./tests/scripts/benchmark-golden-restore.sh <label> <slice>
#   slice: document-service | shard-1
#   label: e.g. before-migration | after-migration
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

LABEL="${1:?label required}"
SLICE="${2:?slice required (document-service|shard-1)}"
ITERATIONS="${3:-3}"

export ENV_PATH="$ROOT/test-apps/api/.env"
export JWT_SECRET=aSecret
export STRAPI_GRAPHQL_V4_COMPATIBILITY_MODE=true
export STRAPI_DISABLE_EE=true
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--experimental-vm-modules"

JEST_ARGS=(--config jest.config.api.js --runInBand --forceExit)
case "$SLICE" in
  document-service)
    JEST_ARGS+=(tests/api/core/strapi/document-service/)
    ;;
  shard-1)
    JEST_ARGS+=(--shard=1/4)
    ;;
  *)
    echo "Unknown slice: $SLICE" >&2
    exit 1
    ;;
esac

# Ensure golden snapshot (one-time cost, not included in per-run timings below)
if [[ ! -d test-apps/.golden/api ]]; then
  echo "[benchmark] capturing golden snapshot..."
  node -e "
    const path = require('path');
    process.env.ENV_PATH = path.resolve('test-apps/api/.env');
    process.env.JWT_SECRET = 'aSecret';
    const { createStrapiInstance } = require('./packages/utils/api-tests/strapi');
    const { captureGoldenSnapshot } = require('./packages/utils/api-tests/golden-snapshot');
    (async () => {
      const strapi = await createStrapiInstance({ logLevel: 'error' });
      await captureGoldenSnapshot({ strapi });
      await strapi.destroy();
    })();
  "
fi

RESULTS_DIR="$ROOT/test-apps/.golden/benchmark-results"
mkdir -p "$RESULTS_DIR"
OUT="$RESULTS_DIR/${LABEL}-${SLICE}.txt"

echo "# $LABEL — $SLICE — $(date -u +%Y-%m-%dT%H:%MZ)" | tee "$OUT"
echo "iterations: $ITERATIONS" | tee -a "$OUT"

for i in $(seq 1 "$ITERATIONS"); do
  echo "--- run $i/$ITERATIONS ---" | tee -a "$OUT"
  /usr/bin/time -p node node_modules/.bin/jest "${JEST_ARGS[@]}" 2>&1 | tee -a "$OUT" | tail -3
done
