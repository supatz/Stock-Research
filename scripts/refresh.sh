#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/refresh-$(date +%Y%m%d-%H%M%S).log"

cd "$ROOT_DIR"

pipeline_python() {
  if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
    echo "$ROOT_DIR/.venv/bin/python"
  else
    echo "python3"
  fi
}

refresh_dataset() {
  echo "Refreshing website snapshot (S&P 500 + yfinance; Edgar if cache older than EDGAR_MAX_AGE_DAYS)..."
  local py
  py="$(pipeline_python)"
  if [[ "$py" != *".venv"* ]]; then
    echo "Note: .venv not found — using system python3. Prefer: python3 -m venv .venv && . .venv/bin/activate && pip install -e 'pipeline[live,dev]'"
  fi
  # Does not refresh Wikipedia membership unless sp500.json is missing.
  # Use: "$py" pipeline/run.py --universe-only   when constituents change.
  "$py" pipeline/run.py
  echo "Dataset refresh complete."
}

publish_git() {
  if [[ -z "$(git status --porcelain)" ]]; then
    echo "Nothing to commit."
  else
    git add -A
    local message="${1:-}"
    if [[ -z "$message" && -t 0 ]]; then
      read -r -p "Commit message [Refresh stock research site]: " message
    fi
    message="${message:-Refresh stock research site $(date +%Y-%m-%d)}"
    git commit -m "$message"
  fi
  git push
  echo "Git publish complete."
}

usage() {
  cat <<'EOF'
Usage: scripts/refresh.sh [--dataset | --git | --both] [--message "text"]

No arguments:
  Interactive terminal: show a menu
  Non-interactive run: refresh dataset only (never commits or pushes)
EOF
}

mode=""
message=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dataset) mode="dataset" ;;
    --git) mode="git" ;;
    --both) mode="both" ;;
    --message)
      shift
      [[ $# -gt 0 ]] || { echo "--message requires a value"; exit 2; }
      message="$1"
      ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 2 ;;
  esac
  shift
done

if [[ -z "$mode" ]]; then
  if [[ ! -t 0 ]]; then
    mode="dataset"
  else
    printf '\nStock Research refresh\n'
    printf '  1) Dataset only\n'
    printf '  2) Git push only\n'
    printf '  3) Dataset + Git push\n'
    read -r -p "Choose [1]: " choice
    case "${choice:-1}" in
      1) mode="dataset" ;;
      2) mode="git" ;;
      3) mode="both" ;;
      *) echo "Invalid choice"; exit 2 ;;
    esac
  fi
fi

{
  case "$mode" in
    dataset) refresh_dataset ;;
    git) publish_git "$message" ;;
    both) refresh_dataset; publish_git "$message" ;;
  esac

  echo "Log: $LOG_FILE"
} 2>&1 | tee -a "$LOG_FILE"
