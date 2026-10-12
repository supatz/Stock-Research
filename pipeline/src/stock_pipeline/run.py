from __future__ import annotations

import argparse
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import PipelineConfig, SECTOR_BENCHMARKS


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUTPUT = REPO_ROOT / "public" / "data" / "v1"


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


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def build_bootstrap_snapshot(output: Path) -> None:
    """Write contract-valid bootstrap metadata without fabricating market observations.

    The frontend uses deterministic TypeScript fixtures in mock mode. Live OHLCV
    acquisition and FinanceToolkit calculations are deliberately a separate phase.
    """

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

    _write_json(
        output / "manifest.json",
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
    )
    _write_json(
        output / "quality.json",
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
    )
    print(f"Wrote bootstrap snapshot metadata to {output}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Stock Research website snapshots")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    build_bootstrap_snapshot(args.output.resolve())


if __name__ == "__main__":
    main()
