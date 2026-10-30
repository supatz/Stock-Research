from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Iterable, List


def write_json(path: Path, value: Any, *, indent: int | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(value, indent=indent, separators=(",", ":") if indent is None else None)
    if indent is not None:
        text += "\n"
    path.write_text(text, encoding="utf-8")


def envelope(
    *,
    schema_version: str,
    market_date: str,
    generated_at: str,
    pipeline_version: str,
    data_sources: List[str],
    payload: Any,
) -> Dict[str, Any]:
    return {
        "schemaVersion": schema_version,
        "marketDate": market_date,
        "generatedAt": generated_at,
        "pipelineVersion": pipeline_version,
        "dataSources": data_sources,
        "payload": payload,
    }


def write_snapshot_tree(
    output: Path,
    *,
    manifest: Dict[str, Any],
    overview: Dict[str, Any],
    universe: List[Dict[str, Any]],
    screener: List[Dict[str, Any]],
    stocks: Iterable[Dict[str, Any]],
    quality: Dict[str, Any],
    meta: Dict[str, Any],
) -> None:
    output.mkdir(parents=True, exist_ok=True)
    write_json(output / "manifest.json", manifest, indent=2)
    write_json(
        output / "market" / "overview.json",
        envelope(payload=overview, **meta),
        indent=2,
    )
    write_json(output / "universe.json", envelope(payload=universe, **meta), indent=2)
    write_json(output / "screener.json", envelope(payload=screener, **meta), indent=2)
    write_json(output / "quality.json", quality, indent=2)

    for item in stocks:
        ticker = item["summary"]["ticker"]
        stock_dir = output / "stocks" / ticker
        write_json(stock_dir / "summary.json", envelope(payload=item["summary"], **meta))
        write_json(stock_dir / "technicals.json", envelope(payload=item["detail"], **meta))
        write_json(stock_dir / "history.json", envelope(payload=item["history"], **meta))
