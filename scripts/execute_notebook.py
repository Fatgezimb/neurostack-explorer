#!/usr/bin/env python3
"""Execute the committed notebook top-to-bottom and fail on any cell error."""

from __future__ import annotations

import shutil
from pathlib import Path

import nbformat
from nbclient import NotebookClient

REPO_ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK_PATH = REPO_ROOT / "notebooks" / "neurostack_explorer.ipynb"
DOWNLOAD_PATH = REPO_ROOT / "public" / "downloads" / "neurostack_explorer.ipynb"

notebook = nbformat.read(NOTEBOOK_PATH, as_version=4)
client = NotebookClient(
    notebook,
    timeout=120,
    kernel_name="python3",
    allow_errors=False,
    resources={"metadata": {"path": str(REPO_ROOT)}},
)
client.execute(cwd=str(REPO_ROOT))
for cell in notebook.cells:
    # nbclient adds wall-clock timing metadata. It is not analytically useful and
    # would make two otherwise identical executions produce different bytes.
    cell.metadata.pop("execution", None)
nbformat.write(notebook, NOTEBOOK_PATH)
DOWNLOAD_PATH.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(NOTEBOOK_PATH, DOWNLOAD_PATH)
print(f"Executed {NOTEBOOK_PATH}")
