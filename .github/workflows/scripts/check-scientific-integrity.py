#!/usr/bin/env python3
"""Verify committed scientific evidence without fetching the source dataset.

This check deliberately operates on the compact, committed release artifacts. Source
NWB, CmdStan, and BridgeStan regeneration require reviewed external inputs/toolchains
and therefore remain separate release operations.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
ARTIFACT_DIR = REPO_ROOT / "public" / "artifacts" / "v1"
EXPECTED_PYTHON = "3.12.13"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    require(isinstance(value, dict), f"Expected a JSON object: {path}")
    return value


def artifact_path(relative: str) -> Path:
    require(not relative.startswith("/"), f"Absolute artifact path: {relative}")
    candidate = (ARTIFACT_DIR / relative).resolve()
    require(
        candidate.is_relative_to(ARTIFACT_DIR.resolve()),
        f"Artifact path escapes its release directory: {relative}",
    )
    return candidate


def verify_record(record: dict[str, Any], *, label: str) -> Path:
    path = artifact_path(str(record["path"]))
    require(path.is_file(), f"{label} is missing: {path}")
    require(sha256(path) == record["sha256"], f"{label} SHA-256 drifted: {path}")
    if "sizeBytes" in record:
        require(
            path.stat().st_size == record["sizeBytes"],
            f"{label} byte size drifted: {path}",
        )
    return path


def main() -> int:
    declared_python = (REPO_ROOT / ".python-version").read_text().strip()
    require(
        declared_python == EXPECTED_PYTHON,
        f".python-version must remain {EXPECTED_PYTHON}, found {declared_python!r}.",
    )
    runtime_python = ".".join(str(part) for part in sys.version_info[:3])
    require(
        runtime_python == declared_python,
        f"Release check requires Python {declared_python}, running {runtime_python}.",
    )

    manifest = load_json(ARTIFACT_DIR / "manifest.json")
    expected_ids = {
        "demo-dataset",
        "synthetic-dataset",
        "model-results",
        "bridgestan-surface",
        "plenoptic-demo",
    }
    artifact_records = manifest["artifacts"]
    require(
        {record["id"] for record in artifact_records} == expected_ids,
        "The release manifest does not contain the complete scientific artifact set.",
    )
    verified_paths = {
        record["id"]: verify_record(record, label=f"artifact {record['id']}")
        for record in artifact_records
    }

    for record in manifest["relatedArtifacts"]:
        verify_record(record, label=f"related artifact {record['id']}")

    notebook_path = REPO_ROOT / "notebooks" / "neurostack_explorer.ipynb"
    public_notebook = ARTIFACT_DIR / "neurostack-explorer.ipynb"
    download_notebook = REPO_ROOT / "public" / "downloads" / "neurostack_explorer.ipynb"
    notebook_manifest = load_json(ARTIFACT_DIR / "notebook-manifest.json")
    notebook_hash = sha256(notebook_path)
    require(
        notebook_hash == notebook_manifest["sha256"],
        "Executed notebook SHA-256 does not match notebook-manifest.json.",
    )
    require(
        notebook_path.read_bytes()
        == public_notebook.read_bytes()
        == download_notebook.read_bytes(),
        "Notebook source, artifact, and download copies are not byte-identical.",
    )
    require(
        notebook_manifest["environmentLockSha256"]
        == sha256(REPO_ROOT / "requirements.lock"),
        "Notebook environment-lock SHA-256 drifted.",
    )
    input_hashes = {
        record["reference"]: record["sha256"] for record in notebook_manifest["inputs"]
    }
    public_dataset = load_json(verified_paths["demo-dataset"])
    require(
        input_hashes
        == {
            "public/artifacts/v1/demo-dataset.json": sha256(
                verified_paths["demo-dataset"]
            ),
            "public/artifacts/v1/synthetic-dataset.json": sha256(
                verified_paths["synthetic-dataset"]
            ),
            "public/artifacts/v1/model-results.json": sha256(
                verified_paths["model-results"]
            ),
            (
                "DANDI:000582/0.251111.2151/"
                "sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb"
            ): public_dataset["metadata"]["sha256"],
        },
        "Notebook input checksums drifted.",
    )

    notebook_text = notebook_path.read_text(encoding="utf-8")
    forbidden_patterns = {
        "macOS home-directory path": r"/Users/[^/\s]+/",
        "Linux home-directory path": r"/home/[^/\s]+/",
        "Windows home-directory path": r"[A-Za-z]:\\\\Users\\\\[^\\\s]+\\\\",
        "AWS access-key prefix": r"AKIA[0-9A-Z]{8,}",
        "GitHub token prefix": r"(?:ghp|github_pat)_",
        "OpenAI-style secret-key prefix": r"sk-[A-Za-z0-9_-]{12,}",
    }
    for label, pattern in forbidden_patterns.items():
        require(
            re.search(pattern, notebook_text) is None,
            f"Notebook sanitization found a {label}.",
        )
    notebook = json.loads(notebook_text)
    code_cells = [cell for cell in notebook["cells"] if cell.get("cell_type") == "code"]
    require(bool(code_cells), "Notebook contains no executable verification cells.")
    require(
        all(cell.get("execution_count") is not None for cell in code_cells),
        "Notebook is not fully executed.",
    )
    require(
        not any(
            output.get("output_type") == "error"
            for cell in code_cells
            for output in cell.get("outputs", [])
        ),
        "Notebook contains an execution error.",
    )
    require(
        notebook_manifest["sanitization"]["status"] == "passed",
        "Notebook manifest does not record successful sanitization.",
    )

    provenance = REPO_ROOT / "data" / "provenance.json"
    validation = REPO_ROOT / "data" / "validation-report.json"
    require(
        provenance.read_bytes() == (ARTIFACT_DIR / "provenance.json").read_bytes(),
        "Public provenance copy drifted.",
    )
    require(
        validation.read_bytes()
        == (ARTIFACT_DIR / "validation-report.json").read_bytes(),
        "Public validation-report copy drifted.",
    )

    bridge = load_json(verified_paths["bridgestan-surface"])
    bridge_source = REPO_ROOT / bridge["model"]["sourcePath"]
    require(
        sha256(bridge_source) == bridge["model"]["sourceSha256"],
        "BridgeStan source changed without regenerating its committed fixture.",
    )

    plenoptic = load_json(verified_paths["plenoptic-demo"])
    for record in (
        plenoptic["input"]["png"],
        plenoptic["synthesis"]["png"],
        plenoptic["synthesis"]["differencePng"],
        plenoptic["synthesis"]["representationDifferencePng"],
        *(checkpoint["png"] for checkpoint in plenoptic["synthesis"]["checkpoints"]),
    ):
        verify_record(record, label=f"plenoptic image {record['path']}")

    print(f"Python release runtime: {runtime_python}")
    print(f"Manifest artifacts: {len(artifact_records)} checksums and sizes verified")
    print(
        "Notebook: executed, sanitized, input-linked, and byte-identical across copies"
    )
    print("BridgeStan: committed fixture linked to its exact Stan source")
    print(
        "plenoptic: source, synthesis, two differences, and checkpoint images verified"
    )
    print(
        "Source NWB/model refits: validated from committed evidence; no network fetch run"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
