#!/usr/bin/env python3
"""Fail closed when generated evidence, hashes, or disclosures drift."""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker  # type: ignore[import-untyped]

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "python"))

from neurostack_explorer.constants import (  # noqa: E402
    ASSET_SHA256,
    ASSET_UUID,
    EXPECTED_UNIT_IDS,
    PIPELINE_SEED,
)


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_schema(instance_path: Path, schema_path: Path) -> None:
    instance = load_json(instance_path)
    schema = load_json(schema_path)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(instance), key=lambda error: list(error.path))
    if errors:
        details = "\n".join(
            f"  {'/'.join(str(part) for part in error.path) or '<root>'}: {error.message}"
            for error in errors
        )
        raise AssertionError(f"{instance_path} failed schema validation:\n{details}")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def main() -> int:
    artifact_dir = REPO_ROOT / "public" / "artifacts" / "v1"
    public_path = artifact_dir / "demo-dataset.json"
    synthetic_path = artifact_dir / "synthetic-dataset.json"
    manifest_path = artifact_dir / "manifest.json"
    notebook_manifest_path = artifact_dir / "notebook-manifest.json"
    provenance_path = REPO_ROOT / "data" / "provenance.json"
    validation_path = REPO_ROOT / "data" / "validation-report.json"
    notebook_path = REPO_ROOT / "notebooks" / "neurostack_explorer.ipynb"
    public_notebook_path = artifact_dir / "neurostack-explorer.ipynb"
    public_provenance_path = artifact_dir / "provenance.json"
    public_validation_path = artifact_dir / "validation-report.json"
    model_results_path = artifact_dir / "model-results.json"
    bridge_path = artifact_dir / "bridgestan-surface.json"
    plenoptic_path = artifact_dir / "plenoptic-demo.json"

    validate_schema(
        provenance_path, REPO_ROOT / "schemas" / "dataset-provenance.schema.json"
    )
    validate_schema(
        notebook_manifest_path,
        REPO_ROOT / "schemas" / "notebook-manifest.schema.json",
    )
    generated_artifact_schema = (
        REPO_ROOT / "schemas" / "scientific-artifact-bundle.schema.json"
    )
    for generated_path in (
        public_path,
        synthetic_path,
        manifest_path,
        validation_path,
        public_validation_path,
        model_results_path,
        bridge_path,
        plenoptic_path,
    ):
        validate_schema(generated_path, generated_artifact_schema)

    public = load_json(public_path)
    synthetic = load_json(synthetic_path)
    manifest = load_json(manifest_path)
    provenance = load_json(provenance_path)
    validation = load_json(validation_path)
    notebook_manifest = load_json(notebook_manifest_path)

    require(
        public_path.stat().st_size < 2 * 1024 * 1024, "Public artifact is too large."
    )
    require(
        public["metadata"]["assetUuid"] == ASSET_UUID,
        "Public artifact asset UUID drifted.",
    )
    require(
        public["metadata"]["sha256"] == ASSET_SHA256,
        "Public artifact source SHA-256 drifted.",
    )
    require(
        tuple(public["metadata"]["unitIds"]) == EXPECTED_UNIT_IDS,
        "Selected public unit IDs drifted.",
    )
    require(
        len(public["position"]["timestamps"]) == 6_000,
        "Derivative position sample count drifted.",
    )
    require(len(public["units"]) == 8, "Public artifact unit count drifted.")
    require(
        set(public["models"]) == {"nemos", "sklearn", "pytorch", "stan"},
        "Aligned model set drifted.",
    )
    require(
        all(
            model["status"] == "computed"
            and model["artifactAvailable"] is True
            and model["origin"] == "public-derived"
            and model["execution"] == "precomputed"
            and len(model["observed"]) == len(model["predicted"]) > 0
            and isinstance(model["metricValue"], (int, float))
            for model in public["models"].values()
        ),
        "A required public model output is not computed and aligned.",
    )

    require(
        synthetic["metadata"]["origin"] == "synthetic",
        "Fallback origin is not synthetic.",
    )
    require(
        synthetic["metadata"]["seed"] == PIPELINE_SEED,
        "Synthetic fallback seed drifted.",
    )
    require(
        synthetic["metadata"]["assetUuid"] is None,
        "Synthetic fallback improperly carries a source asset UUID.",
    )
    require(
        all(
            model["status"] == "specification-only"
            and model["artifactAvailable"] is False
            and not model["observed"]
            and not model["predicted"]
            for model in synthetic["models"].values()
        ),
        "Synthetic fallback improperly presents an unfitted model as computed.",
    )

    manifest_entries = {item["id"]: item for item in manifest["artifacts"]}
    require(
        manifest_entries["demo-dataset"]["sha256"] == sha256(public_path),
        "Manifest public artifact hash does not match the file.",
    )
    require(
        manifest_entries["synthetic-dataset"]["sha256"] == sha256(synthetic_path),
        "Manifest synthetic artifact hash does not match the file.",
    )
    require(
        all(not item["path"].startswith("/") for item in manifest["artifacts"]),
        "Manifest artifact paths are not relative for GitHub Pages.",
    )
    require(
        provenance["selectedAssets"][0]["sha256"] == ASSET_SHA256,
        "Provenance source hash drifted.",
    )
    require(
        provenance["derivatives"][0]["sha256"] == sha256(public_path),
        "Provenance derivative hash does not match the file.",
    )
    require(
        validation["source"]["actualSha256"] == ASSET_SHA256,
        "Validation source hash drifted.",
    )
    require(
        validation["publicDerivative"]["sha256"] == sha256(public_path),
        "Validation derivative hash does not match the file.",
    )
    require(
        all(
            check["passed"]
            for section in ("publicDerivative", "syntheticFallback")
            for check in validation[section]["checks"]
        ),
        "One or more generated-artifact checks failed.",
    )

    require(
        notebook_manifest["status"] == "executed",
        "Notebook is not recorded as executed.",
    )
    require(
        notebook_manifest["sha256"] == sha256(notebook_path),
        "Notebook manifest hash does not match the notebook.",
    )
    require(
        notebook_manifest["execution"]["errorCount"] == 0,
        "Notebook manifest records one or more cell errors.",
    )
    require(
        notebook_manifest["sanitization"]["status"] == "passed",
        "Notebook sanitization did not pass.",
    )
    require(
        sha256(public_notebook_path) == sha256(notebook_path),
        "Public notebook copy does not match its repository source.",
    )
    require(
        public_provenance_path.read_bytes() == provenance_path.read_bytes(),
        "Public provenance copy drifted from data/provenance.json.",
    )
    require(
        public_validation_path.read_bytes() == validation_path.read_bytes(),
        "Public validation copy drifted from data/validation-report.json.",
    )

    model_results = load_json(model_results_path)
    require(
        model_results["inputFingerprint"] == public["modelInputFingerprint"],
        "Model input fingerprint does not match the public derivative.",
    )
    require(
        public["models"]["stan"]["diagnostics"]["divergentTransitions"] == 0
        and public["models"]["stan"]["diagnostics"]["maxRHat"] < 1.05,
        "Stan diagnostics exceed the documented lightweight-fixture thresholds.",
    )
    require(
        public["models"]["pytorch"]["configuration"]["architecture"] == [4, 8, 1]
        and public["models"]["pytorch"]["activationExample"]["testRow"] == 4500
        and len(public["models"]["pytorch"]["activationExample"]["standardizedInput"])
        == 4
        and len(public["models"]["pytorch"]["activationExample"]["hiddenActivation"])
        == 8
        and len(public["models"]["stan"]["posteriorSummary"]) == 5,
        "Four-feature model metadata is incomplete or inconsistent.",
    )
    posterior_samples = public["models"]["stan"]["posteriorDrawSamples"]
    require(
        posterior_samples["sourceDrawCount"] == 1000
        and posterior_samples["displayDrawCount"] == 200
        and posterior_samples["drawStride"] == 5
        and len(posterior_samples["parameters"]) == 5
        and all(
            len(parameter["values"]) == posterior_samples["displayDrawCount"]
            for parameter in posterior_samples["parameters"]
        ),
        "Stan posterior display samples must contain five deterministic 200-draw lanes from 1,000 source draws.",
    )
    sklearn = public["models"]["sklearn"]
    sklearn_audit = sklearn["crossValidation"]
    require(
        sklearn_audit["outerTrainingRows"] == [0, 3600]
        and sklearn_audit["alphaGrid"] == [0.0, 0.001, 0.01, 0.1]
        and len(sklearn_audit["folds"]) == 3
        and all(
            fold["trainRows"][1] == fold["validationRows"][0]
            and fold["validationRows"][1] <= 3600
            and [row["alpha"] for row in fold["results"]] == sklearn_audit["alphaGrid"]
            for fold in sklearn_audit["folds"]
        ),
        "scikit-learn training-only chronological CV audit is incomplete.",
    )
    selected_sklearn = min(
        sklearn_audit["summary"],
        key=lambda row: (row["meanPoissonDeviance"], -row["alpha"]),
    )
    require(
        sklearn_audit["selectedAlpha"] == selected_sklearn["alpha"]
        and sklearn["configuration"]["alpha"] == selected_sklearn["alpha"]
        and math.isfinite(sklearn["baseline"]["validationMetricValue"])
        and math.isfinite(sklearn["baseline"]["finalTestMetricValue"]),
        "scikit-learn selection or training-mean baseline is inconsistent.",
    )
    pytorch = public["models"]["pytorch"]
    architecture_comparisons = pytorch["architectureComparisons"]
    selected_pytorch = min(
        architecture_comparisons,
        key=lambda row: (
            row["validationMetricValue"],
            row["parameterCount"],
            row["id"],
        ),
    )
    require(
        [row["id"] for row in architecture_comparisons]
        == ["linear-softplus", "mlp-4-8-1", "mlp-4-8-1-regularized"]
        and pytorch["selectedArchitectureId"] == selected_pytorch["id"]
        and sum(bool(row["selected"]) for row in architecture_comparisons) == 1
        and all(
            row["seed"] == PIPELINE_SEED
            and row["device"] == "cpu"
            and row["deterministicAlgorithms"] is True
            and math.isfinite(row["validationMetricValue"])
            and math.isfinite(row["finalTestMetricValue"])
            for row in architecture_comparisons
        ),
        "PyTorch deterministic architecture comparison is incomplete or inconsistent.",
    )
    basis_explorer = public["models"]["nemos"]["basisExplorer"]
    require(
        basis_explorer["status"] == "computed"
        and basis_explorer["usedInFrozenFit"] is False
        and len(basis_explorer["inputGrid"]) == 41
        and len(basis_explorer["configurations"]) == 6
        and all(
            len(configuration["featureNames"])
            == configuration["nBasisFunctions"]
            == len(configuration["curves"])
            and all(len(curve["values"]) == 41 for curve in configuration["curves"])
            and all(
                len(row) == configuration["nBasisFunctions"]
                for row in configuration["designMatrixSample"]["rows"]
            )
            for configuration in basis_explorer["configurations"]
        ),
        "NeMoS computed basis explorer metadata is incomplete.",
    )
    predictive_check = public["models"]["stan"]["posteriorPredictiveCheck"]
    require(
        predictive_check["posteriorDrawCount"] == 1000
        and predictive_check["heldOutSampleCount"] == 1499
        and len(predictive_check["displayRows"]) == 300
        and len(predictive_check["predictiveCountQ05"]) == 300
        and len(predictive_check["predictiveCountMedian"]) == 300
        and len(predictive_check["predictiveCountQ95"]) == 300
        and all(
            low <= median <= high
            for low, median, high in zip(
                predictive_check["predictiveCountQ05"],
                predictive_check["predictiveCountMedian"],
                predictive_check["predictiveCountQ95"],
            )
        )
        and predictive_check["intervalCoverage"]["totalRows"] == 1499,
        "Stan posterior predictive check is incomplete or inconsistent.",
    )
    generator_provenance = model_results["generatorProvenance"]
    generator_files = {
        item["path"]: item["sha256"] for item in generator_provenance["files"]
    }
    require(
        set(generator_files)
        == {
            "scripts/run_models.py",
            "python/neurostack_explorer/modeling.py",
            "python/stan/poisson_encoding.stan",
            "requirements.lock",
        }
        and all(
            digest == sha256(REPO_ROOT / path)
            for path, digest in generator_files.items()
        )
        and (
            generator_provenance["gitCommit"] is None
            or len(generator_provenance["gitCommit"]) == 40
        ),
        "Model generator provenance hashes or Git identity drifted.",
    )
    bridge = load_json(bridge_path)
    require(
        bridge["status"] == "computed"
        and bridge["gradientCheck"]["status"] == "passed"
        and bridge["gradientCheck"]["maxAbsoluteError"] <= 1e-6,
        "BridgeStan fixture is missing or failed its finite-difference check.",
    )
    plenoptic = load_json(plenoptic_path)
    require(
        plenoptic["status"] == "computed"
        and plenoptic["synthesis"]["finalLoss"] < plenoptic["synthesis"]["initialLoss"],
        "plenoptic fixture is missing or did not reduce model loss.",
    )
    for record in (
        plenoptic["input"]["png"],
        plenoptic["synthesis"]["png"],
        plenoptic["synthesis"]["differencePng"],
        plenoptic["synthesis"]["representationDifferencePng"],
        *(checkpoint["png"] for checkpoint in plenoptic["synthesis"]["checkpoints"]),
    ):
        require(
            record["sha256"] == sha256(artifact_dir / record["path"]),
            f"plenoptic image hash drifted for {record['path']}.",
        )

    print(
        "Schema validation: provenance, notebook manifest, and all shipped JSON "
        "artifacts passed"
    )
    print(f"Public derivative: {public_path.stat().st_size:,} bytes, hash verified")
    print("Synthetic fallback: deterministic seed and separation verified")
    print("Notebook: executed, sanitized, and hash-linked")
    print("Models: NeMoS, scikit-learn, PyTorch, and Stan outputs verified")
    print("Interface demos: BridgeStan gradient check and plenoptic synthesis verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
