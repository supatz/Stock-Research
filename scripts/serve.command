#!/bin/bash
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d dist ]]; then
  npm install
  npm run build
fi

python3 serve.py
