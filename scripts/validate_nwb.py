#!/usr/bin/env python3
"""Validate the pinned NWB source without modifying or redistributing it."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "python"))

from neurostack_explorer.artifacts import (  # noqa: E402
    extract_source_recording,
    fetch_verified_source,
    run_nwb_inspector,
    sha256_path,
)
from neurostack_explorer.constants import ASSET_SHA256, ASSET_UUID  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Verify the immutable, checksummed NWB fixture with PyNWB and the "
            "project's reviewed source invariants."
        )
    )
    parser.add_argument(
        "--source",
        type=Path,
        help="Optional local path to the exact pinned NWB asset.",
    )
    parser.add_argument(
        "--inspect",
        action="store_true",
        help="Also run NWB Inspector and include its machine-readable summary.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = (
        args.source.resolve()
        if args.source
        else fetch_verified_source(allow_download=False)
    )
    recording = extract_source_recording(source)
    report = {
        "status": "passed",
        "source": str(source),
        "assetUuid": ASSET_UUID,
        "sha256": sha256_path(source),
        "expectedSha256": ASSET_SHA256,
        "nwbIdentifier": recording.nwb_identifier,
        "nwbVersion": recording.nwb_version,
        "positionSampleCount": recording.source_position_sample_count,
        "unitIds": [str(unit["id"]) for unit in recording.units],
        "electrodeCount": recording.electrode_count,
        "lfpSampleRateHz": recording.lfp_sample_rate_hz,
        "pyNwbSchemaErrors": list(recording.schema_validation_errors),
    }
    if args.inspect:
        report["nwbInspector"] = run_nwb_inspector(source)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
