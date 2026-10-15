#!/usr/bin/env python3
"""Compare exact plenoptic values and decoded pixels across platform PNG encoders."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]


def compare_payload(
    expected: Any, actual: Any, before_dir: Path, after_dir: Path, key: str = "root"
) -> None:
    if isinstance(expected, dict) and isinstance(actual, dict):
        if expected.keys() != actual.keys():
            raise RuntimeError(f"plenoptic fields differ at {key}.")
        image = (
            isinstance(expected.get("path"), str)
            and expected["path"].endswith(".png")
            and "sha256" in expected
        )
        if image:
            if expected["path"] != actual["path"]:
                raise RuntimeError(f"plenoptic image path differs at {key}.")
            relative = Path(expected["path"])
            if relative.is_absolute() or ".." in relative.parts:
                raise RuntimeError(f"Unsafe image path at {key}.")
            before, after = before_dir / relative, after_dir / relative
            for path, payload in [(before, expected), (after, actual)]:
                if hashlib.sha256(path.read_bytes()).hexdigest() != payload["sha256"]:
                    raise RuntimeError(f"plenoptic image checksum invalid at {key}.")
            with Image.open(before) as left, Image.open(after) as right:
                if (
                    left.mode != right.mode
                    or left.size != right.size
                    or left.tobytes() != right.tobytes()
                ):
                    raise RuntimeError(f"plenoptic decoded pixels differ at {key}.")
        if image and expected["sha256"] != actual["sha256"]:
            print(f"PNG encoding differs at {key}; decoded pixels match exactly.")
        for name in expected:
            if not (image and name == "sha256"):
                compare_payload(
                    expected[name], actual[name], before_dir, after_dir, f"{key}.{name}"
                )
    elif isinstance(expected, list) and isinstance(actual, list):
        if len(expected) != len(actual):
            raise RuntimeError(f"plenoptic array length differs at {key}.")
        for index, (before, after) in enumerate(zip(expected, actual)):
            compare_payload(before, after, before_dir, after_dir, f"{key}[{index}]")
    elif type(expected) is not type(actual) or expected != actual:
        raise RuntimeError(
            f"plenoptic value differs at {key}: {expected!r} != {actual!r}."
        )


def main() -> None:
    release = REPO_ROOT / "public/artifacts/v1"
    expected = json.loads((release / "plenoptic-demo.json").read_text())
    with tempfile.TemporaryDirectory(prefix="neurostack-plenoptic-") as directory:
        generated = Path(directory)
        subprocess.run(
            [
                sys.executable,
                str(REPO_ROOT / "scripts/generate_plenoptic_demo.py"),
                "--output-dir",
                str(generated),
            ],
            check=True,
        )
        actual = json.loads((generated / "plenoptic-demo.json").read_text())
        compare_payload(expected, actual, release, generated)
    print(
        "Fresh plenoptic synthesis matches exact scientific values, configs and decoded PNG pixels."
    )
    print(
        "PNG compression bytes may differ; immutable release files/checksums are unchanged."
    )


if __name__ == "__main__":
    main()
