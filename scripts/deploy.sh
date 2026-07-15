#!/usr/bin/env bash
# Builds, deploys, and names the gallery for the Vitrine contract on
# Stellar testnet.
#
# Prerequisites:
#   - Rust + the wasm32-unknown-unknown target
#   - stellar-cli
#   - A funded testnet identity: `stellar keys generate admin --network testnet --fund`
#
# Usage:
#   ./scripts/deploy.sh "Anish's Gallery"

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 \"gallery name\""
  exit 1
fi

GALLERY_NAME="$1"
NETWORK="testnet"
IDENTITY="admin"
CONTRACT_DIR="contracts/vitrine"
WASM_PATH="target/wasm32-unknown-unknown/release/vitrine.wasm"

echo "==> Building contract"
cd "$(dirname "$0")/.."
cd "$CONTRACT_DIR"
stellar contract build
cd - > /dev/null

echo "==> Optimizing wasm"
stellar contract optimize --wasm "$CONTRACT_DIR/$WASM_PATH"
OPTIMIZED_WASM="${WASM_PATH%.wasm}.optimized.wasm"

echo "==> Deploying to $NETWORK"
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$CONTRACT_DIR/$OPTIMIZED_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")

echo "Contract deployed: $CONTRACT_ID"

ADMIN_ADDRESS=$(stellar keys address "$IDENTITY")

echo "==> Naming the gallery"
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- \
  initialize \
  --admin "$ADMIN_ADDRESS" \
  --gallery_name "$GALLERY_NAME"

echo ""
echo "Done. Add this to frontend/.env:"
echo "  VITE_CONTRACT_ID=$CONTRACT_ID"
