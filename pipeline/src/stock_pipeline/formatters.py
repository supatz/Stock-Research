from __future__ import annotations

from typing import Optional


def round_to(value: Optional[float], digits: int = 4) -> Optional[float]:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number:  # NaN
        return None
    return round(number, digits)


def format_percent(value: Optional[float], digits: int = 1, signed: bool = True) -> str:
    if value is None:
        return "—"
    abs_text = f"{abs(value):.{digits}f}"
    if not signed:
        return f"{abs_text}%"
    if value > 0:
        return f"+{abs_text}%"
    if value < 0:
        return f"-{abs_text}%"
    return f"{0:.{digits}f}%"


def format_number(value: Optional[float], digits: int = 1) -> str:
    if value is None:
        return "—"
    return f"{value:.{digits}f}"


def format_signed_number(value: Optional[float], digits: int = 2) -> str:
    if value is None:
        return "—"
    abs_text = f"{abs(value):.{digits}f}"
    if value > 0:
        return f"+{abs_text}"
    if value < 0:
        return f"-{abs_text}"
    return f"{0:.{digits}f}"


def format_price(value: Optional[float]) -> str:
    if value is None:
        return "—"
    return f"${value:.2f}"


def format_volume(shares: Optional[float]) -> str:
    if shares is None:
        return "—"
    if shares >= 1e9:
        return f"{shares / 1e9:.2f}B"
    if shares >= 1e6:
        return f"{shares / 1e6:.1f}M"
    return f"{int(round(shares)):,}"


def format_dollars(value: Optional[float]) -> str:
    if value is None:
        return "—"
    sign = "-" if value < 0 else ""
    abs_value = abs(value)
    if abs_value >= 1e12:
        return f"{sign}${abs_value / 1e12:.2f}T"
    if abs_value >= 1e9:
        return f"{sign}${abs_value / 1e9:.1f}B"
    if abs_value >= 1e6:
        return f"{sign}${abs_value / 1e6:.1f}M"
    return f"{sign}${abs_value:,.0f}"


def format_multiple(value: Optional[float]) -> str:
    if value is None:
        return "—"
    return f"{value:.2f}×"
