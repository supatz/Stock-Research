from __future__ import annotations

import argparse
import logging
import subprocess
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

import pandas as pd

from .assemble import assemble_stock
from .comparisons import build_peer_snapshot
from .config import SCHEMA_VERSION, SECTOR_BENCHMARKS, PipelineConfig, always_include_tickers
from .edgar import resolve_financials
from .envfile import load_dotenv
from .market_context import build_market_overview
from .quality import build_quality_report
from .serialize import write_snapshot_tree
from .sources.yahoo_source import YahooMarketDataSource, enrich_market_caps
from .sp500 import refresh_and_save, universe_path
from .technicals import compute_indicator_frame, latest_row
from .universe import resolve_universe


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUTPUT = REPO_ROOT / "public" / "data" / "v1"
load_dotenv(REPO_ROOT / ".env")

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("stock_pipeline")


def _git_sha() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=REPO_ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return "uncommitted"


def _infer_market_date(frames: Dict[str, pd.DataFrame]) -> str:
    spy = frames.get("SPY")
    if spy is not None and not spy.empty:
        return pd.Timestamp(spy.index[-1]).date().isoformat()
    dates = []
    for frame in frames.values():
        if frame is not None and not frame.empty:
            dates.append(pd.Timestamp(frame.index[-1]).date())
    if not dates:
        return date.today().isoformat()
    return max(dates).isoformat()


def _slice_ticker(ohlcv: pd.DataFrame, ticker: str) -> pd.DataFrame:
    if ohlcv.empty:
        return pd.DataFrame()
    if isinstance(ohlcv.index, pd.MultiIndex):
        if ticker not in ohlcv.index.get_level_values(0):
            return pd.DataFrame()
        frame = ohlcv.xs(ticker, level=0).copy()
    else:
        frame = ohlcv[ohlcv.get("ticker") == ticker].copy() if "ticker" in ohlcv.columns else ohlcv
    if not isinstance(frame.index, pd.DatetimeIndex):
        if "date" in frame.columns:
            frame = frame.set_index("date")
        frame.index = pd.to_datetime(frame.index)
    return frame.sort_index()


def _precompute_rs(
    equity_latest: Dict[str, Dict[str, Any]],
    benchmark_latest: Dict[str, Dict[str, Any]],
    equities: List[Dict[str, Any]],
) -> None:
    spy = benchmark_latest.get("SPY") or {}
    for row in equities:
        ticker = str(row["ticker"])
        latest = equity_latest.get(ticker)
        if not latest:
            continue
        sector_etf = str(row.get("sectorBenchmark") or SECTOR_BENCHMARKS.get(row["sectorId"], "XLK"))
        sector = benchmark_latest.get(sector_etf) or {}

        def excess(key: str) -> Optional[float]:
            left = latest.get(key)
            right = spy.get(key)
            if left is None or right is None:
                return None
            return float(left) - float(right)

        def excess_sector(key: str) -> Optional[float]:
            left = latest.get(key)
            right = sector.get(key)
            if left is None or right is None:
                return None
            return float(left) - float(right)

        latest["rs.spy.1m"] = excess("ret_1m")
        latest["rs.spy.3m"] = excess("ret_3m")
        latest["rs.spy.6m"] = excess("ret_6m")
        latest["rs.spy.12m"] = excess("ret_1y")
        latest["rs.sector.1m"] = excess_sector("ret_1m")
        latest["rs.sector.3m"] = excess_sector("ret_3m")
        latest["rs.sector.6m"] = excess_sector("ret_6m")
        latest["rs.sector.12m"] = excess_sector("ret_1y")


def build_live_snapshot(
    output: Path,
    *,
    limit: Optional[int] = None,
    tickers: Optional[Sequence[str]] = None,
    skip_edgar: bool = False,
    force_edgar: bool = False,
    refresh_universe: bool = False,
) -> Dict[str, Any]:
    config = PipelineConfig.from_environment()
    warnings: List[str] = []
    now = datetime.now(timezone.utc)
    generated_at = now.isoformat().replace("+00:00", "Z")
    pipeline_version = _git_sha()

    equities, universe_source, universe_warnings = resolve_universe(
        config,
        limit=limit,
        tickers=tickers,
        refresh_universe=refresh_universe,
    )
    warnings.extend(universe_warnings)
    logger.info(
        "Universe: %d equities via %s (file=%s)",
        len(equities),
        universe_source,
        universe_path(),
    )

    # Prefer mega-cap names when FinanceDatabase only has categorical caps (tied numerics).
    equities.sort(
        key=lambda item: (
            0 if item.get("capTier") == "mega" else 1,
            str(item.get("ticker") or ""),
        )
    )
    if limit is not None and tickers is None:
        equities = equities[:limit]

    try:
        enrich_market_caps(equities)
        for row in equities:
            if float(row.get("marketCap") or 0) > 0:
                row["capTier"] = config.cap_tier(float(row["marketCap"]))
    except Exception as exc:  # noqa: BLE001
        warnings.append(f"Market-cap enrichment skipped: {exc}")

    benchmarks = always_include_tickers()
    fetch_tickers = sorted({*(row["ticker"] for row in equities), *benchmarks})
    end = date.today()
    start = end - timedelta(days=int(365.25 * config.lookback_years) + 30)

    source = YahooMarketDataSource()
    logger.info("Fetching OHLCV for %d symbols via yfinance…", len(fetch_tickers))
    ohlcv = source.fetch_frame(fetch_tickers, start, end)
    if ohlcv.empty:
        raise SystemExit("No OHLCV data returned from yfinance.")

    metric_frames: Dict[str, pd.DataFrame] = {}
    latest_by_ticker: Dict[str, Dict[str, Any]] = {}
    for symbol in sorted({*(row["ticker"] for row in equities), *benchmarks}):
        raw = _slice_ticker(ohlcv, symbol)
        if raw.empty or len(raw) < 30:
            logger.warning("Insufficient history for %s (%d bars)", symbol, len(raw))
            continue
        metrics = compute_indicator_frame(raw)
        metric_frames[symbol] = metrics
        latest_by_ticker[symbol] = latest_row(metrics)

    if "SPY" not in latest_by_ticker:
        raise SystemExit("Fatal: SPY history missing after fetch/indicator stage.")

    market_date = _infer_market_date(metric_frames)
    spy_frame = metric_frames["SPY"]
    spy_latest = latest_by_ticker["SPY"]
    benchmark_latest = {t: latest_by_ticker[t] for t in benchmarks if t in latest_by_ticker}

    equity_latest = {
        row["ticker"]: latest_by_ticker[row["ticker"]]
        for row in equities
        if row["ticker"] in latest_by_ticker
    }
    _precompute_rs(equity_latest, benchmark_latest, equities)

    peers = build_peer_snapshot(equities, equity_latest, market_date, config)

    # Preliminary regime from SPY alone; refined after equity assembly.
    from .states import derive_regime

    preliminary_regime = derive_regime(
        (spy_latest.get("dist50") or -1) >= 0,
        (spy_latest.get("dist200") or -1) >= 0,
        ((benchmark_latest.get("QQQ") or {}).get("dist200") or -1) >= 0,
        50.0,
        50.0,
    )

    built: List[Dict[str, Any]] = []
    for row in equities:
        ticker = str(row["ticker"])
        if ticker not in metric_frames:
            warnings.append(f"{ticker}: excluded — insufficient OHLCV history.")
            continue
        sector_etf = str(row.get("sectorBenchmark") or SECTOR_BENCHMARKS[row["sectorId"]])
        sector_latest = benchmark_latest.get(sector_etf) or spy_latest
        quality = "good"
        quality_message = None
        latest = equity_latest[ticker]
        if latest.get("date") != market_date:
            quality = "stale"
            quality_message = (
                f"Stale price: last close is {latest.get('date')}, "
                f"before the market date {market_date}."
            )
        if len(metric_frames[ticker]) < config.historical_min_observations:
            quality = "insufficient" if quality == "good" else quality
            quality_message = quality_message or (
                f"Historical percentile unavailable — requires at least "
                f"{config.historical_min_observations} valid observations. "
                f"This series has {len(metric_frames[ticker])} sessions."
            )

        financials, edgar_source = resolve_financials(
            ticker,
            config.sec_identity_email,
            max_age_days=config.edgar_max_age_days,
            force=force_edgar,
            skip=skip_edgar,
        )
        if edgar_source == "fetch":
            logger.info("Edgar fetch %s", ticker)

        item = assemble_stock(
            equity=row,
            metric_frame=metric_frames[ticker],
            latest=latest,
            spy_latest=spy_latest,
            sector_latest=sector_latest,
            spy_frame=spy_frame,
            peers=peers,
            regime=preliminary_regime,
            market_date=market_date,
            financials=financials,
            config=config,
            quality=quality,
            quality_message=quality_message,
        )
        built.append(item)

    if not built:
        raise SystemExit("Fatal: no equities were assembled into snapshots.")

    # VIX optional (^VIX on Yahoo)
    vix_level = None
    try:
        vix_alt = source.fetch_frame(["^VIX"], start, end)
        vix_raw = _slice_ticker(vix_alt, "^VIX")
        if not vix_raw.empty:
            vix_level = float(vix_raw["close"].iloc[-1])
    except Exception as exc:  # noqa: BLE001
        warnings.append(f"VIX fetch failed: {exc}")
    if vix_level is None:
        warnings.append("VIX unavailable from yfinance; market.vix marked unavailable.")

    overview = build_market_overview(
        as_of=market_date,
        generated_at=generated_at,
        equity_details=[item["detail"] for item in built],
        benchmark_latest=benchmark_latest,
        vix_level=vix_level,
    )
    regime = overview["regime"]
    for item in built:
        item["detail"]["dimensions"][-1]["state"] = regime["state"]
        item["detail"]["dimensions"][-1]["shortText"] = regime["summary"]
        item["detail"]["dimensions"][-1]["primary"] = regime["label"]
        item["detail"]["takeaways"]["market"] = (
            f"{regime['summary']} {item['summary']['sector']} versus SPY over three months is "
            f"{item['detail']['metrics'].get('market.sector-vs-spy', {}).get('displayValue', '—')}."
        )

    data_sources = sorted(
        {
            "yfinance",
            universe_source,
            "FinanceToolkit|pandas",
            "internal:comparisons:v1",
            *(["edgartools"] if not skip_edgar else []),
        }
    )
    meta = {
        "schema_version": SCHEMA_VERSION,
        "market_date": market_date,
        "generated_at": generated_at,
        "pipeline_version": pipeline_version,
        "data_sources": data_sources,
    }
    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "marketDate": market_date,
        "generatedAt": generated_at,
        "pipelineVersion": pipeline_version,
        "dataSources": data_sources,
        "mode": "snapshot",
        "note": (
            "Personal unpaid EOD snapshot. Manual refresh only. "
            "Not investment advice. Yahoo data subject to Yahoo terms."
        ),
        "provenance": {
            "ohlcv": "yfinance",
            "indicators": "FinanceToolkit where available; otherwise pandas Wilder/SMA/MACD",
            "universe": universe_source,
            "comparisons": "internal:v1",
            "financials": (
                "skipped"
                if skip_edgar
                else f"edgartools cache max-age {config.edgar_max_age_days}d"
            ),
        },
    }

    universe_payload = [item["summary"] for item in built]
    screener_payload = [item["screener"] for item in built]
    quality = build_quality_report(
        market_date=market_date,
        generated_at=generated_at,
        pipeline_version=pipeline_version,
        data_sources=data_sources,
        equities=equities,
        built_tickers=[item["summary"]["ticker"] for item in built],
        benchmark_latest=benchmark_latest,
        warnings=warnings,
    )

    if quality["payload"]["fatalErrors"]:
        write_snapshot_tree(
            output,
            manifest=manifest,
            overview=overview,
            universe=universe_payload,
            screener=screener_payload,
            stocks=built,
            quality=quality,
            meta=meta,
        )
        for err in quality["payload"]["fatalErrors"]:
            logger.error("FATAL: %s", err)
        raise SystemExit(2)

    write_snapshot_tree(
        output,
        manifest=manifest,
        overview=overview,
        universe=universe_payload,
        screener=screener_payload,
        stocks=built,
        quality=quality,
        meta=meta,
    )
    logger.info(
        "Wrote live snapshot for %s (%d equities) → %s",
        market_date,
        len(built),
        output,
    )
    return quality


def build_bootstrap_snapshot(output: Path) -> None:
    """Kept for tests/backward compatibility: metadata-only bootstrap."""

    from .config import SECTOR_BENCHMARKS
    import json
    import os

    config = PipelineConfig.from_environment()
    now = datetime.now(timezone.utc)
    market_date = os.getenv("SNAPSHOT_MARKET_DATE", now.date().isoformat())
    common = {
        "schemaVersion": "1.0.0",
        "marketDate": market_date,
        "generatedAt": now.isoformat().replace("+00:00", "Z"),
        "pipelineVersion": _git_sha(),
        "dataSources": ["bootstrap:no-live-market-data"],
    }
    output.mkdir(parents=True, exist_ok=True)
    (output / "manifest.json").write_text(
        json.dumps(
            {
                **common,
                "payload": {
                    "mode": "bootstrap",
                    "latestSnapshot": market_date,
                    "marketDataSource": config.data_source,
                    "available": False,
                    "message": "Live snapshots are not configured; use VITE_DATA_MODE=mock.",
                },
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (output / "quality.json").write_text(
        json.dumps(
            {
                **common,
                "payload": {
                    "status": "warning",
                    "fatalErrors": [],
                    "warnings": ["No live market-data adapter has been configured."],
                    "checks": {
                        "manifestGenerated": True,
                        "liveDataAvailable": False,
                        "sectorBenchmarksConfigured": len(SECTOR_BENCHMARKS) == 11,
                    },
                },
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote bootstrap snapshot metadata to {output}")


def main(argv: Optional[Sequence[str]] = None) -> None:
    parser = argparse.ArgumentParser(description="Build Stock Research website snapshots")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, default=None, help="Limit equity count (smoke tests)")
    parser.add_argument(
        "--tickers",
        type=str,
        default=None,
        help="Comma-separated equity tickers (overrides universe file)",
    )
    parser.add_argument(
        "--refresh-universe",
        action="store_true",
        help="Refresh pipeline/data/universe/sp500.json from Wikipedia before the run",
    )
    parser.add_argument(
        "--universe-only",
        action="store_true",
        help="Only refresh the S&P 500 universe file, then exit",
    )
    parser.add_argument("--skip-edgar", action="store_true", help="Skip EdgarTools entirely")
    parser.add_argument(
        "--force-edgar",
        action="store_true",
        help="Ignore 30-day Edgar cache and refetch SEC facts",
    )
    parser.add_argument(
        "--bootstrap",
        action="store_true",
        help="Write metadata-only bootstrap files (no live market data)",
    )
    args = parser.parse_args(argv)
    output = args.output.resolve()

    if args.bootstrap:
        build_bootstrap_snapshot(output)
        return

    if args.universe_only:
        config = PipelineConfig.from_environment()
        path, count = refresh_and_save(config)
        print(f"S&P 500 universe: {count} constituents → {path}")
        return

    tickers = None
    if args.tickers:
        tickers = [part.strip().upper() for part in args.tickers.split(",") if part.strip()]

    try:
        build_live_snapshot(
            output,
            limit=args.limit,
            tickers=tickers,
            skip_edgar=args.skip_edgar,
            force_edgar=args.force_edgar,
            refresh_universe=args.refresh_universe,
        )
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("Pipeline failed: %s", exc)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
