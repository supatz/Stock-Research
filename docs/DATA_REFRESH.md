# Data refresh and publish

The site has two independent data modes:

- `mock`: deterministic TypeScript fixtures for UI development and tests.
- `snapshot`: generated, versioned JSON under `public/data/v1`.

**Universe:** S&P 500 constituents in `pipeline/data/universe/sp500.json`.  
Prices/technicals refresh as often as you run the pipeline.  
**Edgar financials** are cached under `pipeline/cache/edgar/` and reused until
`EDGAR_MAX_AGE_DAYS` (default **30**). Daily/weekly price runs do not re-hit SEC
unless the cache is stale or you pass `--force-edgar`.

This personal unpaid stack is **manual refresh only**.

## SEC identity (no signup)

Put your email in local `.env` (gitignored). SEC fair-access only needs a
User-Agent identity string — there is **no account to create**:

```bash
SEC_IDENTITY_EMAIL=you@example.com
# or: SEC_IDENTITY_EMAIL=Your Name you@example.com
EDGAR_MAX_AGE_DAYS=30
```

## One-command workflow

```bash
./scripts/refresh.sh
./scripts/refresh.sh --dataset
./scripts/refresh.sh --git
./scripts/refresh.sh --both --message "Refresh EOD snapshot"
```

`refresh.command` opens the same menu. Choose **3 (Dataset + Git push)** to
update [the Netlify site](https://us-stock-market.netlify.app/market) after a
push. Logs go to `logs/`.

`scripts/refresh-universe.command` only refreshes S&P 500 membership
(`pipeline/data/universe/sp500.json`) from Wikipedia. Use it when constituents
change; then run `refresh.command` → **3** for prices + publish.

## Live snapshot refresh

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e 'pipeline[live,dev]'

# 1) Refresh the S&P 500 membership list (when constituents change)
python pipeline/run.py --universe-only

# 2) Daily / weekly prices for the universe file (Edgar uses 30-day cache)
python pipeline/run.py

# Smoke (first N names)
python pipeline/run.py --limit 8

# Force SEC refetch even if cache is fresh
python pipeline/run.py --force-edgar

# Prices only (no Edgar network / cache write)
python pipeline/run.py --skip-edgar
```

Outputs: `public/data/v1/` (`manifest.json`, `market/overview.json`,
`universe.json`, `screener.json`, `quality.json`, and per-ticker
`stocks/{TICKER}/{summary,technicals,history}.json`).

```bash
# .env
VITE_DATA_MODE=snapshot
npm run dev
```

## How prices vs Edgar interact

| Run | Yahoo OHLCV | Edgar SEC facts |
|---|---|---|
| Normal `python pipeline/run.py` | Always refetch | Use cache if &lt; 30 days old; else fetch + cache |
| `--skip-edgar` | Always refetch | Skip (empty financials unless old cache exists and identity missing path uses cache) |
| `--force-edgar` | Always refetch | Ignore age; refetch + rewrite cache |
| `--universe-only` | No | No — only rewrites `sp500.json` |

Membership changes are infrequent. Refresh the universe file when you hear of
S&P adds/drops, or periodically (e.g. monthly) with `--universe-only` /
`--refresh-universe`.

## Netlify

`netlify.toml` runs tests and builds with `VITE_DATA_MODE=snapshot`. It does
**not** re-fetch market data. Commit refreshed `public/data/v1/**` after a local
dataset run (`./scripts/refresh.sh --both`).

## New-computer recovery

```bash
git clone https://github.com/supatz/Stock-Research.git
cd Stock-Research
npm install
python3 -m venv .venv && . .venv/bin/activate
python -m pip install -e 'pipeline[live,dev]'
cp .env.example .env   # set SEC_IDENTITY_EMAIL
python pipeline/run.py --universe-only
python pipeline/run.py --limit 8
npm run dev
```
