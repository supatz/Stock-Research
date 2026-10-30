from datetime import datetime, timedelta, timezone
import json

from stock_pipeline.edgar import read_edgar_cache, resolve_financials, write_edgar_cache


def test_edgar_cache_hit_and_expiry(tmp_path, monkeypatch):
    monkeypatch.setattr("stock_pipeline.edgar.EDGAR_CACHE_DIR", tmp_path)

    write_edgar_cache(
        "AAPL",
        {
            "currency": "USD",
            "annual": [{"period": "2024", "year": 2024, "revenue": 1}],
            "quarterly": [],
            "takeaway": "ok",
            "provenance": "edgartools:company-facts",
        },
    )
    hit = read_edgar_cache("AAPL", max_age_days=30)
    assert hit is not None
    assert hit["annual"][0]["revenue"] == 1
    assert "cache" in hit["provenance"]

    # Age the cache beyond max age.
    path = tmp_path / "AAPL.json"
    payload = json.loads(path.read_text())
    old = (datetime.now(timezone.utc) - timedelta(days=45)).isoformat().replace("+00:00", "Z")
    payload["fetchedAt"] = old
    path.write_text(json.dumps(payload))
    assert read_edgar_cache("AAPL", max_age_days=30) is None


def test_resolve_skips_when_requested(monkeypatch, tmp_path):
    monkeypatch.setattr("stock_pipeline.edgar.EDGAR_CACHE_DIR", tmp_path)
    financials, source = resolve_financials("MSFT", "me@example.com", skip=True)
    assert source == "skipped"
    assert financials["provenance"] == "edgar:skipped"


def test_skip_edgar_still_reuses_cache(monkeypatch, tmp_path):
    monkeypatch.setattr("stock_pipeline.edgar.EDGAR_CACHE_DIR", tmp_path)
    write_edgar_cache(
        "MSFT",
        {
            "currency": "USD",
            "annual": [{"period": "2024", "year": 2024, "revenue": 2}],
            "quarterly": [],
            "takeaway": "ok",
            "provenance": "edgartools:company-facts",
        },
    )
    financials, source = resolve_financials("MSFT", "me@example.com", skip=True)
    assert source == "cache"
    assert financials["annual"][0]["revenue"] == 2
