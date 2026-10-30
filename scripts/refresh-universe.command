#!/bin/bash
# Double-click on macOS to refresh the S&P 500 membership list
# (pipeline/data/universe/sp500.json). Does not fetch prices or Edgar.
set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

printf '\nStock Research — refresh S&P 500 universe\n\n'

if [[ ! -x "$ROOT_DIR/.venv/bin/python" ]]; then
  printf 'No .venv found. Creating one and installing pipeline deps…\n'
  python3 -m venv .venv
  .venv/bin/python -m pip install -U pip
  .venv/bin/python -m pip install -e 'pipeline[live,dev]'
fi

.venv/bin/python pipeline/run.py --universe-only

printf '\nDone. Membership file: pipeline/data/universe/sp500.json\n'
printf 'Next: run refresh.command and choose 3 to rebuild prices + publish.\n'
printf '\nPress Return to close...'
read -r
