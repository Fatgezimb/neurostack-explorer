from __future__ import annotations

import hashlib
import sys
from pathlib import Path

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from verify_plenoptic import compare_payload  # noqa: E402


def fixture(directory: Path, compression: int, pixel: int = 91):
    directory.mkdir()
    path = directory / "fixture.png"
    Image.new("L", (24, 24), color=pixel).save(path, compress_level=compression)
    return {
        "metric": 0.1234,
        "image": {
            "path": "./fixture.png",
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        },
    }


def test_png_encoding_can_differ_but_decoded_pixels_and_values_match(tmp_path):
    left, right = tmp_path / "left", tmp_path / "right"
    expected, actual = fixture(left, 0), fixture(right, 9)
    assert expected["image"]["sha256"] != actual["image"]["sha256"]
    compare_payload(expected, actual, left, right)


@pytest.mark.parametrize("change", ["metric", "pixels", "checksum", "path", "fields"])
def test_numeric_pixel_and_integrity_changes_fail(tmp_path, change):
    left, right = tmp_path / "left", tmp_path / "right"
    expected = fixture(left, 9)
    actual = fixture(right, 9, 92 if change == "pixels" else 91)
    if change == "metric":
        actual["metric"] = 0.1235
    elif change == "checksum":
        actual["image"]["sha256"] = "wrong"
    elif change == "path":
        actual["image"]["path"] = "../fixture.png"
    elif change == "fields":
        actual["extra"] = True
    with pytest.raises(RuntimeError):
        compare_payload(expected, actual, left, right)
