from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal, Optional


QualityStatus = Literal[
    "OK",
    "STALE",
    "INSUFFICIENT_HISTORY",
    "SOURCE_ERROR",
    "CALCULATION_ERROR",
]


@dataclass(frozen=True)
class Comparison:
    percentile: Optional[float]
    sample_size: int
    cohort_label: str
    fallback_level: Optional[str] = None


@dataclass(frozen=True)
class MetricObservation:
    metric_id: str
    as_of: str
    raw_value: Optional[float]
    display_value: str
    interpretation_state: str
    quality_status: QualityStatus = "OK"
    historical: Optional[Comparison] = None
    sector_relative: Optional[Comparison] = None
    market_relative: Optional[Comparison] = None


@dataclass(frozen=True)
class Snapshot:
    schema_version: str
    market_date: str
    generated_at: str
    pipeline_version: str
    data_sources: list[str]
    payload: Any
    provenance: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
