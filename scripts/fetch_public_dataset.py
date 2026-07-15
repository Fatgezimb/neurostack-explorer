#!/usr/bin/env python3
"""Fetch only the reviewed immutable DANDI asset after explicit gate approval."""

from __future__ import annotations

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "python"))

from neurostack_explorer.artifacts import fetch_verified_source  # noqa: E402


def main() -> int:
    if (
        os.environ.get("NEUROSTACK_DATASET_STATUS") != "verified"
        or os.environ.get("NEUROSTACK_ALLOW_PUBLIC_DATA_FETCH") != "true"
    ):
        raise SystemExit(
            "Public-data fetch is gated. Set NEUROSTACK_DATASET_STATUS=verified "
            "and NEUROSTACK_ALLOW_PUBLIC_DATA_FETCH=true after reviewing provenance."
        )
    path = fetch_verified_source(allow_download=True)
    print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
