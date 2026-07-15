#!/usr/bin/env python3
"""Build reviewed web derivatives from the already cached source asset."""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "python"))

from neurostack_explorer.artifacts import build_all  # noqa: E402


def main() -> int:
    paths = build_all(
        REPO_ROOT,
        allow_download=False,
        inspect_source=True,
    )
    for label, path in paths.items():
        print(f"{label}: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
