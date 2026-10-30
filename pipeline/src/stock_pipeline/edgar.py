from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .formatters import format_dollars, format_percent, round_to

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
EDGAR_CACHE_DIR = REPO_ROOT / "pipeline" / "cache" / "edgar"


def _cache_path(ticker: str) -> Path:
    return EDGAR_CACHE_DIR / f"{ticker.upper()}.json"


def _parse_iso(value: str | None) -> Optional[datetime]:
    if not value:
        return None
    try:
        text = value.replace("Z", "+00:00")
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def read_edgar_cache(ticker: str, *, max_age_days: int) -> Optional[Dict[str, Any]]:
    path = _cache_path(ticker)
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    fetched = _parse_iso(payload.get("fetchedAt"))
    if fetched is None:
        return None
    if fetched.tzinfo is None:
        fetched = fetched.replace(tzinfo=timezone.utc)
    age = datetime.now(timezone.utc) - fetched.astimezone(timezone.utc)
    if age.days > max_age_days:
        return None
    financials = payload.get("financials")
    if not isinstance(financials, dict):
        return None
    # Annotate reuse so quality/logs stay honest.
    provenance = str(financials.get("provenance") or "edgartools:cache")
    if "cache" not in provenance:
        financials = {
            **financials,
            "provenance": f"{provenance}|cache:{age.days}d",
        }
    return financials


def write_edgar_cache(ticker: str, financials: Dict[str, Any]) -> None:
    EDGAR_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "ticker": ticker.upper(),
        "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "financials": financials,
    }
    _cache_path(ticker).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def resolve_financials(
    ticker: str,
    email: Optional[str],
    *,
    max_age_days: int = 30,
    force: bool = False,
    skip: bool = False,
) -> Tuple[Dict[str, Any], str]:
    """Return (financials, source) where source is skipped|cache|fetch|empty."""

    # Price-only runs (--skip-edgar) still reuse a fresh cache so financials
    # panels are not wiped on daily/weekly Yahoo refreshes.
    if not force:
        cached = read_edgar_cache(ticker, max_age_days=max_age_days)
        if cached is not None:
            return cached, "cache"
    if skip:
        return empty_financials("edgar:skipped"), "skipped"
    if not email:
        return empty_financials("edgar:skipped-no-identity"), "skipped"
    financials = fetch_financials(ticker, email)
    # Cache successful and empty results so we do not hammer SEC every daily price run.
    if financials.get("provenance", "").startswith("edgar:error"):
        return financials, "fetch-error"
    write_edgar_cache(ticker, financials)
    return financials, "fetch"


def empty_financials(reason: str) -> Dict[str, Any]:
    return {
        "currency": "USD",
        "annual": [],
        "quarterly": [],
        "periods": [],
        "takeaway": "Financial statements are unavailable for this snapshot.",
        "provenance": reason,
    }


def empty_key_statistics(market_cap: float) -> Dict[str, Any]:
    return {
        "pe": None,
        "peBand": None,
        "peAverage": None,
        "sectorPe": None,
        "pb": None,
        "pbBand": None,
        "pbAverage": None,
        "beta": None,
        "marketCap": float(market_cap),
        "week52High": None,
        "week52Low": None,
        "vwap": None,
        "vwapVsPricePct": None,
    }


def _valuation_band(value: Optional[float], average: Optional[float]) -> Optional[str]:
    if value is None or average is None or average <= 0:
        return None
    ratio = value / average
    if ratio < 0.9:
        return "low"
    if ratio > 1.1:
        return "high"
    return "average"


def configure_sec_identity(email: Optional[str]) -> bool:
    """SEC fair-access User-Agent identity. No account signup — just name + email."""

    if not email:
        return False
    identity = email.strip()
    # edgartools / SEC prefer "Name email@domain"; accept bare email too.
    if " " not in identity and "@" in identity:
        identity = f"Stock Research {identity}"
    os.environ["EDGAR_IDENTITY"] = identity
    try:
        from edgar import set_identity

        set_identity(identity)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not set SEC identity: %s", exc)
        return False


def _statement_frame(financials_obj: Any, method_name: str) -> Any:
    method = getattr(financials_obj, method_name, None)
    if method is None:
        return None
    try:
        statement = method() if callable(method) else method
    except Exception:  # noqa: BLE001
        return None
    if statement is None:
        return None
    if hasattr(statement, "to_dataframe"):
        try:
            return statement.to_dataframe()
        except Exception:  # noqa: BLE001
            return None
    return statement if hasattr(statement, "columns") else None


def fetch_financials(ticker: str, email: Optional[str]) -> Dict[str, Any]:
    """Best-effort SEC company facts via EdgarTools. Degrades to empty objects."""

    if not email:
        return empty_financials("edgar:skipped-no-identity")

    try:
        configure_sec_identity(email)
        from edgar import Company

        company = Company(ticker)
        financials_obj = None
        getter = getattr(company, "get_financials", None)
        if callable(getter):
            try:
                financials_obj = getter()
            except Exception:  # noqa: BLE001
                financials_obj = None
        if financials_obj is None:
            return empty_financials("edgar:no-facts")

        income = _statement_frame(financials_obj, "income_statement")
        cashflow = _statement_frame(financials_obj, "cashflow_statement")
        annual = _periods_from_wide_statement(income, cashflow, "annual")
        quarterly: List[Dict[str, Any]] = []

        takeaway = "Financial statements are unavailable for this snapshot."
        if annual:
            latest = annual[-1]
            takeaway = (
                f"{ticker} financials show {latest['period']} revenue of "
                f"{format_dollars(latest['revenue'])} with operating margin "
                f"{format_percent(latest['operatingMargin'], 1, False)}."
            )
        return {
            "currency": "USD",
            "annual": annual,
            "quarterly": quarterly,
            "periods": annual,
            "takeaway": takeaway,
            "provenance": "edgartools:company-facts",
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("Edgar financials failed for %s: %s", ticker, exc)
        return empty_financials(f"edgar:error:{type(exc).__name__}")


def _find_row(frame: Any, *needles: str) -> Optional[Any]:
    if frame is None or "label" not in getattr(frame, "columns", []):
        return None
    labels = frame["label"].astype(str).str.lower()
    for needle in needles:
        hits = frame.loc[labels == needle.lower()]
        if not hits.empty:
            return hits.iloc[0]
    for needle in needles:
        hits = frame.loc[labels.str.contains(needle.lower(), regex=False)]
        if not hits.empty:
            return hits.iloc[0]
    return None


def _period_columns(frame: Any) -> List[str]:
    cols: List[str] = []
    for col in getattr(frame, "columns", []):
        text = str(col)
        if len(text) >= 4 and text[0].isdigit():
            cols.append(text)
    return cols


def _cell_float(row: Any, column: str) -> Optional[float]:
    if row is None:
        return None
    try:
        value = row[column]
        number = float(value)
    except Exception:  # noqa: BLE001
        return None
    if number != number:  # NaN
        return None
    return number


def _periods_from_wide_statement(
    income: Any,
    cashflow: Any,
    frequency: str,
) -> List[Dict[str, Any]]:
    """Parse edgartools Statement dataframes (metrics in rows, period dates in columns)."""

    if income is None:
        return []
    period_cols = _period_columns(income)
    if not period_cols:
        return []

    revenue_row = _find_row(
        income,
        "contract revenue",
        "total net sales",
        "net sales",
        "revenue",
        "total revenue",
    )
    net_row = _find_row(income, "net income", "net income (loss)")
    op_row = _find_row(income, "operating income", "operating income (loss)")
    gross_row = _find_row(income, "gross profit")
    eps_row = _find_row(income, "earnings per share (diluted)", "diluted eps", "eps diluted")
    fcf_row = _find_row(
        cashflow,
        "free cash flow",
        "cash from operating activities",
        "net cash provided by operating activities",
    )

    periods: List[Dict[str, Any]] = []
    for col in sorted(period_cols):
        revenue = _cell_float(revenue_row, col)
        if revenue is None or revenue == 0:
            continue
        net_income = _cell_float(net_row, col) or 0.0
        operating_income = _cell_float(op_row, col)
        gross_profit = _cell_float(gross_row, col)
        eps = _cell_float(eps_row, col) or 0.0
        fcf = _cell_float(fcf_row, col)
        if fcf is None:
            fcf = net_income
        operating_margin = (
            round_to((operating_income / revenue) * 100, 1)
            if operating_income is not None
            else round_to((net_income / revenue) * 100, 1) or 0.0
        )
        gross_margin = (
            round_to((gross_profit / revenue) * 100, 1)
            if gross_profit is not None
            else operating_margin
        )
        year = 0
        for token in col.replace("/", "-").split("-"):
            if token.isdigit() and len(token) == 4:
                year = int(token)
                break
        periods.append(
            {
                "period": col,
                "year": year or 0,
                "frequency": frequency,
                "revenue": abs(revenue),
                "netIncome": net_income,
                "eps": eps,
                "pe": None,
                "sectorPe": None,
                "grossMargin": gross_margin or 0.0,
                "operatingMargin": operating_margin or 0.0,
                "operatingIncome": operating_income
                if operating_income is not None
                else abs(revenue) * ((operating_margin or 0.0) / 100.0),
                "freeCashFlow": fcf,
            }
        )
    return periods[-10:]


def merge_key_statistics(
    *,
    market_cap: float,
    week52_high: Optional[float],
    week52_low: Optional[float],
    vwap: Optional[float],
    vwap_vs_price: Optional[float],
    beta: Optional[float],
    financials: Dict[str, Any],
) -> Dict[str, Any]:
    annual = financials.get("annual") or []
    pe_history = [row.get("pe") for row in annual if isinstance(row.get("pe"), (int, float))]
    pe_average = round_to(sum(pe_history) / len(pe_history), 1) if pe_history else None
    latest = annual[-1] if annual else None
    pe = latest.get("pe") if latest else None
    sector_pe = latest.get("sectorPe") if latest else None
    return {
        "pe": pe,
        "peBand": _valuation_band(pe, pe_average),
        "peAverage": pe_average,
        "sectorPe": sector_pe,
        "pb": None,
        "pbBand": None,
        "pbAverage": None,
        "beta": round_to(beta, 2),
        "marketCap": float(market_cap),
        "week52High": round_to(week52_high, 2),
        "week52Low": round_to(week52_low, 2),
        "vwap": round_to(vwap, 2),
        "vwapVsPricePct": round_to(vwap_vs_price, 2),
    }
