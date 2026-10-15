#!/usr/bin/env python3
"""Compare fresh notebook execution with release science without rewriting artifacts."""

from __future__ import annotations

import copy
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import nbformat
from nbclient import NotebookClient

REPO_ROOT = Path(__file__).resolve().parents[1]


def comparable_cell(cell: Any) -> dict[str, Any]:
    result: dict[str, Any] = copy.deepcopy(dict(cell))
    result.get("metadata", {}).pop("execution", None)
    # This one reviewed cell records platform.platform() explicitly. Keep Python
    # and every package version checked; only the operating-system label varies.
    if result.get("id") == "neurostack-04":
        for output in result.get("outputs", []):
            if output.get("output_type") == "stream":
                output["text"] = "".join(
                    line
                    for line in output["text"].splitlines(keepends=True)
                    if not line.startswith("platform: ")
                )
    return result


def compare_notebooks(expected: Any, actual: Any) -> None:
    if expected.metadata != actual.metadata:
        raise RuntimeError("Notebook metadata differs from the reviewed release.")
    if len(expected.cells) != len(actual.cells):
        raise RuntimeError("Notebook cell count differs from the reviewed release.")
    for index, (before, after) in enumerate(zip(expected.cells, actual.cells)):
        if comparable_cell(before) != comparable_cell(after):
            fields = [
                key
                for key in set(before) | set(after)
                if comparable_cell(before).get(key) != comparable_cell(after).get(key)
            ]
            raise RuntimeError(
                f"Notebook cell {index + 1} ({before.get('id')}) differs: {fields}."
            )


def main() -> None:
    expected = nbformat.read(
        REPO_ROOT / "notebooks/neurostack_explorer.ipynb", as_version=4
    )
    with tempfile.TemporaryDirectory(prefix="neurostack-notebook-") as directory:
        generated = Path(directory) / "generated.ipynb"
        subprocess.run(
            [
                sys.executable,
                str(REPO_ROOT / "scripts/create_notebook.py"),
                "--output",
                str(generated),
            ],
            check=True,
        )
        actual = nbformat.read(generated, as_version=4)
        NotebookClient(
            actual,
            timeout=120,
            kernel_name="python3",
            allow_errors=False,
            resources={"metadata": {"path": str(REPO_ROOT)}},
        ).execute(cwd=str(REPO_ROOT))
        compare_notebooks(expected, actual)
    print(
        "Fresh notebook execution matches every scientific cell and locked package version."
    )
    print("Only the explicit OS label and wall-clock execution metadata are excluded.")
    print("Release notebook bytes were not modified; manifest checks run separately.")


if __name__ == "__main__":
    main()
