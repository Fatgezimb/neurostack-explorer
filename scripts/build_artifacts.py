#!/usr/bin/env python3
"""Repository-local wrapper for the NeuroStack artifact pipeline."""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
PYTHON_ROOT = REPO_ROOT / "python"
sys.path.insert(0, str(PYTHON_ROOT))

from neurostack_explorer.cli import main  # noqa: E402


if __name__ == "__main__":
    raise SystemExit(main(["--repo-root", str(REPO_ROOT), *sys.argv[1:]]))
