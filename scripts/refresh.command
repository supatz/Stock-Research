#!/bin/bash
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
./scripts/refresh.sh
printf '\nPress Return to close...'
read -r
