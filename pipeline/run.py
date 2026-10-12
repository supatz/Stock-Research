#!/usr/bin/env python3
"""Run the pipeline from a source checkout without installing the package."""

from __future__ import annotations

import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).parent / "src"))

from stock_pipeline.run import main  # noqa: E402


if __name__ == "__main__":
    main()
