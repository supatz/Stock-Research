from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Dict, Iterable, List, Optional

import pandas as pd

from .base import MarketDataSource

logger = logging.getLogger(__name__)


class YahooMarketDataSource:
    """yfinance adapter that returns a MultiIndex (ticker, date) OHLCV frame."""

    name = "yfinance"

    def get_daily_history(
        self,
        tickers: list[str],
        start_date: date,
        end_date: date,
    ) -> list[dict[str, object]]:
        frame = self.fetch_frame(tickers, start_date, end_date)
        records: list[dict[str, object]] = []
        if frame.empty:
            return records
        for (ticker, dt), row in frame.iterrows():
            records.append(
                {
                    "ticker": ticker,
                    "date": pd.Timestamp(dt).date().isoformat(),
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "adj_close": float(row["adj_close"]),
                    "volume": float(row["volume"]),
                    "source": self.name,
                }
            )
        return records

    @staticmethod
    def _yahoo_symbol(ticker: str) -> str:
        symbol = ticker.upper()
        if symbol == "VIX":
            return "^VIX"
        return symbol

    def fetch_frame(
        self,
        tickers: Iterable[str],
        start_date: date,
        end_date: date,
    ) -> pd.DataFrame:
        import yfinance as yf

        try:
            from pathlib import Path

            cache = Path(__file__).resolve().parents[3] / "cache" / "yfinance"
            cache.mkdir(parents=True, exist_ok=True)
            yf.set_tz_cache_location(str(cache))
        except Exception:  # noqa: BLE001
            pass

        # Keep caller's logical ticker (VIX) while downloading Yahoo's ^VIX.
        logical = sorted({t.upper() for t in tickers})
        yahoo_to_logical = {self._yahoo_symbol(t): t for t in logical}
        symbols = sorted(yahoo_to_logical)
        if not symbols:
            return pd.DataFrame()

        # yfinance end is exclusive for some paths; pad one day.
        end = (end_date + timedelta(days=1)).isoformat()
        start = start_date.isoformat()
        frames: List[pd.DataFrame] = []

        # Batch download; fall back to per-ticker on failure.
        try:
            raw = yf.download(
                tickers=symbols,
                start=start,
                end=end,
                group_by="ticker",
                auto_adjust=False,
                threads=True,
                progress=False,
            )
            frames.extend(self._normalize_download(raw, symbols, yahoo_to_logical))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Batch yfinance download failed (%s); retrying per ticker", exc)

        have = {frame["ticker"].iloc[0] for frame in frames if not frame.empty}
        missing = [symbol for symbol in symbols if yahoo_to_logical[symbol] not in have]
        for symbol in missing:
            logical_ticker = yahoo_to_logical[symbol]
            try:
                hist = yf.Ticker(symbol).history(
                    start=start,
                    end=end,
                    auto_adjust=False,
                    actions=False,
                )
                if hist.empty:
                    logger.warning("No Yahoo history for %s", logical_ticker)
                    continue
                frames.append(self._from_single(hist, logical_ticker))
            except Exception as exc:  # noqa: BLE001
                logger.warning("Yahoo history failed for %s: %s", logical_ticker, exc)

        if not frames:
            return pd.DataFrame(
                columns=["ticker", "date", "open", "high", "low", "close", "adj_close", "volume"]
            ).set_index(["ticker", "date"])

        combined = pd.concat(frames, ignore_index=True)
        combined["date"] = pd.to_datetime(combined["date"]).dt.tz_localize(None)
        combined = combined.dropna(subset=["close", "volume"])
        combined = combined[combined["close"] > 0]
        combined = combined[combined["high"] >= combined["low"]]
        combined = combined[combined["volume"] >= 0]
        combined = combined.sort_values(["ticker", "date"])
        combined = combined.drop_duplicates(["ticker", "date"], keep="last")
        return combined.set_index(["ticker", "date"])

    def _normalize_download(
        self,
        raw: pd.DataFrame,
        symbols: List[str],
        yahoo_to_logical: Optional[Dict[str, str]] = None,
    ) -> List[pd.DataFrame]:
        frames: List[pd.DataFrame] = []
        mapping = yahoo_to_logical or {s: s for s in symbols}
        if raw is None or raw.empty:
            return frames
        if isinstance(raw.columns, pd.MultiIndex):
            for symbol in symbols:
                if symbol not in raw.columns.get_level_values(0):
                    continue
                piece = raw[symbol].copy()
                frames.append(self._from_single(piece, mapping.get(symbol, symbol)))
        else:
            # Single-ticker download collapses the ticker level.
            if len(symbols) == 1:
                symbol = symbols[0]
                frames.append(self._from_single(raw, mapping.get(symbol, symbol)))
        return frames

    def _from_single(self, hist: pd.DataFrame, symbol: str) -> pd.DataFrame:
        frame = hist.copy()
        frame = frame.rename(
            columns={
                "Open": "open",
                "High": "high",
                "Low": "low",
                "Close": "close",
                "Adj Close": "adj_close",
                "Volume": "volume",
            }
        )
        if "adj_close" not in frame.columns:
            frame["adj_close"] = frame["close"]
        keep = ["open", "high", "low", "close", "adj_close", "volume"]
        frame = frame[keep].dropna(how="all")
        frame = frame.reset_index()
        date_col = "Date" if "Date" in frame.columns else frame.columns[0]
        frame = frame.rename(columns={date_col: "date"})
        frame["ticker"] = symbol
        return frame[["ticker", "date", "open", "high", "low", "close", "adj_close", "volume"]]


def ensure_yahoo_source() -> MarketDataSource:
    return YahooMarketDataSource()


def enrich_market_caps(
    equities: List[Dict[str, object]],
    tickers: Optional[Iterable[str]] = None,
) -> None:
    """Best-effort live market-cap fill via yfinance info (mutates rows)."""

    import yfinance as yf

    targets = list(tickers) if tickers is not None else [str(row["ticker"]) for row in equities]
    wanted = {t.upper() for t in targets}
    for row in equities:
        ticker = str(row["ticker"]).upper()
        if ticker not in wanted:
            continue
        try:
            info = yf.Ticker(ticker).fast_info
            cap = getattr(info, "market_cap", None) or getattr(info, "marketCap", None)
            if cap is None and isinstance(info, dict):
                cap = info.get("market_cap") or info.get("marketCap")
            if cap and float(cap) > 0:
                row["marketCap"] = float(cap)
        except Exception:  # noqa: BLE001
            continue
