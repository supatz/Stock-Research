import json

from stock_pipeline.run import build_bootstrap_snapshot


def test_bootstrap_writes_manifest_and_quality(tmp_path):
    build_bootstrap_snapshot(tmp_path)

    manifest = json.loads((tmp_path / "manifest.json").read_text())
    quality = json.loads((tmp_path / "quality.json").read_text())

    assert manifest["schemaVersion"] == "1.0.0"
    assert manifest["payload"]["available"] is False
    assert quality["payload"]["checks"]["sectorBenchmarksConfigured"] is True
