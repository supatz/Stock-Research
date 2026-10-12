from __future__ import annotations

from datetime import date
from typing import Protocol


class MarketDataSource(Protocol):
    """Provider boundary. Implementations return normalized daily OHLCV records."""

    @property
    def name(self) -> str: ...

    def get_daily_history(
        self,
        tickers: list[str],
        start_date: date,
        end_date: date,
    ) -> list[dict[str, object]]: ...
