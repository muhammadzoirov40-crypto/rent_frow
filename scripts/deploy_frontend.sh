#!/usr/bin/env bash
# RentHub frontend deploy — run on the server
# Usage: bash scripts/deploy_frontend.sh
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
TARGET=/var/www/renthub

echo "==> git pull"
git -C "$REPO" pull --ff-only origin master

echo "==> npm build"
(cd "$REPO/frontend" && npm install --no-audit --no-fund && npm run build)

echo "==> deploy to $TARGET"
rm -rf "$TARGET/assets" "$TARGET/index.html" "$TARGET/favicon.svg"
cp -r "$REPO/frontend/dist/." "$TARGET/"

echo "==> done:"
grep -o '<title>[^<]*</title>' "$TARGET/index.html"
