from __future__ import annotations

import hashlib
import json
import math
import subprocess
import sys
import unittest
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "python"))

import numpy as np  # noqa: E402

from neurostack_explorer.artifacts import (  # noqa: E402
    _compute_speed,
    _sample_speed_at_spikes,
    build_synthetic_artifact,
    model_input_fingerprint,
)
from neurostack_explorer.constants import (  # noqa: E402
    ASSET_SHA256,
    ASSET_UUID,
    EXPECTED_UNIT_IDS,
    PIPELINE_SEED,
)
from neurostack_explorer.modeling import prepare_model_task  # noqa: E402


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class ArtifactContractTests(unittest.TestCase):
    artifact_dir: Path
    public_path: Path
    synthetic_path: Path
    public: dict[str, Any]
    synthetic: dict[str, Any]
    manifest: dict[str, Any]
    notebook_manifest: dict[str, Any]
    provenance: dict[str, Any]
    validation: dict[str, Any]

    @classmethod
    def setUpClass(cls) -> None:
        cls.artifact_dir = REPO_ROOT / "public" / "artifacts" / "v1"
        cls.public_path = cls.artifact_dir / "demo-dataset.json"
        cls.synthetic_path = cls.artifact_dir / "synthetic-dataset.json"
        cls.public = load_json(cls.public_path)
        cls.synthetic = load_json(cls.synthetic_path)
        cls.manifest = load_json(cls.artifact_dir / "manifest.json")
        cls.notebook_manifest = load_json(cls.artifact_dir / "notebook-manifest.json")
        cls.provenance = load_json(REPO_ROOT / "data" / "provenance.json")
        cls.validation = load_json(REPO_ROOT / "data" / "validation-report.json")

    def test_public_source_identity_is_exact(self) -> None:
        metadata = self.public["metadata"]
        self.assertEqual(metadata["assetUuid"], ASSET_UUID)
        self.assertEqual(metadata["sha256"], ASSET_SHA256)
        self.assertEqual(metadata["origin"], "public-derived")
        self.assertEqual(tuple(metadata["unitIds"]), EXPECTED_UNIT_IDS)
        self.assertEqual(metadata["license"], "CC-BY-4.0")

    def test_public_arrays_are_consistent_and_bounded(self) -> None:
        position = self.public["position"]
        sample_count = len(position["timestamps"])
        self.assertEqual(sample_count, 6_000)
        self.assertEqual(len(position["x"]), sample_count)
        self.assertEqual(len(position["y"]), sample_count)
        self.assertEqual(len(position["speed"]), sample_count)
        self.assertTrue(
            all(
                later > earlier
                for earlier, later in zip(
                    position["timestamps"], position["timestamps"][1:]
                )
            )
        )
        self.assertLess(self.public_path.stat().st_size, 2 * 1024 * 1024)
        self.assertEqual(len(self.public["derived"]["unitRates"]), 8)
        self.assertTrue(
            all(
                len(rate_row) == len(self.public["derived"]["timeBins"])
                for rate_row in self.public["derived"]["unitRates"]
            )
        )

    def test_all_selected_spikes_are_retained(self) -> None:
        expected_counts = {
            "t1c1": 1759,
            "t2c1": 901,
            "t2c3": 1547,
            "t3c1": 679,
            "t3c2": 776,
            "t3c3": 815,
            "t3c4": 1731,
            "t4c1": 879,
        }
        observed = {unit["id"]: unit["spikeCount"] for unit in self.public["units"]}
        self.assertEqual(observed, expected_counts)
        for unit in self.public["units"]:
            self.assertEqual(unit["spikeCount"], len(unit["spikeTimes"]))
            self.assertTrue(
                all(
                    later > earlier
                    for earlier, later in zip(
                        unit["spikeTimes"], unit["spikeTimes"][1:]
                    )
                )
            )

    def test_manifest_hashes_match_files(self) -> None:
        entries = {item["id"]: item for item in self.manifest["artifacts"]}
        self.assertEqual(entries["demo-dataset"]["sha256"], sha256(self.public_path))
        self.assertEqual(
            entries["synthetic-dataset"]["sha256"], sha256(self.synthetic_path)
        )
        self.assertTrue(
            all(not item["path"].startswith("/") for item in self.manifest["artifacts"])
        )
        public_provenance = self.artifact_dir / "provenance.json"
        public_validation = self.artifact_dir / "validation-report.json"
        self.assertEqual(
            public_provenance.read_bytes(),
            (REPO_ROOT / "data" / "provenance.json").read_bytes(),
        )
        self.assertEqual(
            public_validation.read_bytes(),
            (REPO_ROOT / "data" / "validation-report.json").read_bytes(),
        )

    def test_executed_notebook_is_in_the_evidence_chain(self) -> None:
        notebook_path = REPO_ROOT / "notebooks" / "neurostack_explorer.ipynb"
        notebook_hash = sha256(notebook_path)
        self.assertEqual(self.notebook_manifest["sha256"], notebook_hash)
        self.assertEqual(self.notebook_manifest["status"], "executed")
        self.assertEqual(self.notebook_manifest["execution"]["errorCount"], 0)
        self.assertEqual(self.notebook_manifest["sanitization"]["status"], "passed")
        self.assertEqual(self.validation["notebook"]["sha256"], notebook_hash)
        self.assertEqual(self.validation["notebook"]["status"], "executed")

    def test_synthetic_fallback_is_deterministic_and_separate(self) -> None:
        first = build_synthetic_artifact(PIPELINE_SEED)
        second = build_synthetic_artifact(PIPELINE_SEED)
        self.assertEqual(first, second)
        self.assertEqual(self.synthetic, first)
        self.assertEqual(self.synthetic["metadata"]["origin"], "synthetic")
        self.assertEqual(self.synthetic["metadata"]["seed"], PIPELINE_SEED)
        self.assertIsNone(self.synthetic["metadata"]["assetUuid"])
        self.assertNotEqual(
            set(self.synthetic["metadata"]["unitIds"]), set(EXPECTED_UNIT_IDS)
        )

    def test_public_models_are_actual_aligned_outputs(self) -> None:
        result_path = self.artifact_dir / "model-results.json"
        model_results = load_json(result_path)
        self.assertEqual(
            model_results["inputFingerprint"], model_input_fingerprint(self.public)
        )
        self.assertEqual(
            set(self.public["models"]), {"nemos", "sklearn", "pytorch", "stan"}
        )
        task = self.public["modelTask"]
        self.assertEqual(len(task["features"]), 4)
        self.assertEqual(task["split"]["train"], [0, 3600])
        self.assertEqual(task["split"]["validation"], [3600, 4200])
        self.assertEqual(task["split"]["temporalGap"], [4200, 4500])
        self.assertEqual(task["split"]["test"], [4500, 5999])
        self.assertIn("early stopping", task["validationUse"])
        for model in self.public["models"].values():
            self.assertEqual(model["status"], "computed")
            self.assertTrue(model["artifactAvailable"])
            self.assertEqual(model["origin"], "public-derived")
            self.assertEqual(model["execution"], "precomputed")
            self.assertEqual(len(model["observed"]), len(model["predicted"]))
            self.assertEqual(len(model["observed"]), 300)
            self.assertTrue(math.isfinite(model["metricValue"]))
            self.assertEqual(model["validationSampleCount"], 600)
            self.assertTrue(math.isfinite(model["validationMetricValue"]))
        self.assertEqual(
            self.public["models"]["stan"]["diagnostics"]["divergentTransitions"], 0
        )
        self.assertGreater(
            self.public["models"]["pytorch"]["configuration"]["bestEpoch"], 0
        )
        self.assertEqual(
            self.public["models"]["pytorch"]["configuration"]["architecture"],
            [4, 8, 1],
        )
        activation = self.public["models"]["pytorch"]["activationExample"]
        self.assertEqual(activation["testRow"], 4500)
        self.assertEqual(len(activation["standardizedInput"]), 4)
        self.assertEqual(len(activation["hiddenPreActivation"]), 8)
        self.assertEqual(len(activation["hiddenActivation"]), 8)
        self.assertAlmostEqual(
            activation["predictedCount"],
            self.public["models"]["pytorch"]["predicted"][0],
            delta=1e-6,
        )
        self.assertEqual(len(self.public["models"]["stan"]["posteriorSummary"]), 5)
        posterior_samples = self.public["models"]["stan"]["posteriorDrawSamples"]
        self.assertEqual(posterior_samples["sourceDrawCount"], 1000)
        self.assertEqual(posterior_samples["displayDrawCount"], 200)
        self.assertEqual(posterior_samples["drawStride"], 5)
        self.assertEqual(len(posterior_samples["parameters"]), 5)
        self.assertTrue(
            all(
                len(parameter["values"]) == posterior_samples["displayDrawCount"]
                for parameter in posterior_samples["parameters"]
            )
        )

    def test_sklearn_training_only_cv_and_baseline_are_complete(self) -> None:
        sklearn = self.public["models"]["sklearn"]
        audit = sklearn["crossValidation"]
        self.assertEqual(audit["alphaGrid"], [0.0, 0.001, 0.01, 0.1])
        self.assertEqual(audit["outerTrainingRows"], [0, 3600])
        self.assertEqual(len(audit["folds"]), 3)
        for fold in audit["folds"]:
            self.assertGreater(fold["trainRows"][1], fold["trainRows"][0])
            self.assertEqual(fold["trainRows"][1], fold["validationRows"][0])
            self.assertLessEqual(fold["validationRows"][1], 3600)
            self.assertEqual(
                [row["alpha"] for row in fold["results"]], audit["alphaGrid"]
            )
            self.assertTrue(
                all(
                    math.isfinite(row["meanPoissonDeviance"]) for row in fold["results"]
                )
            )
        selected = min(
            audit["summary"],
            key=lambda row: (row["meanPoissonDeviance"], -row["alpha"]),
        )
        self.assertEqual(audit["selectedAlpha"], selected["alpha"])
        self.assertEqual(sklearn["configuration"]["alpha"], selected["alpha"])
        baseline = sklearn["baseline"]
        self.assertAlmostEqual(baseline["trainingMeanCount"], 0.31305556)
        self.assertTrue(math.isfinite(baseline["validationMetricValue"]))
        self.assertTrue(math.isfinite(baseline["finalTestMetricValue"]))

    def test_pytorch_architecture_selection_uses_validation_only(self) -> None:
        pytorch = self.public["models"]["pytorch"]
        comparisons = pytorch["architectureComparisons"]
        self.assertEqual(
            [row["id"] for row in comparisons],
            ["linear-softplus", "mlp-4-8-1", "mlp-4-8-1-regularized"],
        )
        self.assertTrue(all(row["seed"] == PIPELINE_SEED for row in comparisons))
        self.assertTrue(all(row["device"] == "cpu" for row in comparisons))
        self.assertTrue(
            all(row["deterministicAlgorithms"] is True for row in comparisons)
        )
        selected = min(
            comparisons,
            key=lambda row: (
                row["validationMetricValue"],
                row["parameterCount"],
                row["id"],
            ),
        )
        self.assertEqual(pytorch["selectedArchitectureId"], selected["id"])
        self.assertEqual(sum(bool(row["selected"]) for row in comparisons), 1)
        self.assertTrue(selected["selected"])
        self.assertEqual(
            pytorch["configuration"]["architecture"], selected["architecture"]
        )
        self.assertTrue(
            all(math.isfinite(row["finalTestMetricValue"]) for row in comparisons)
        )

    def test_stan_posterior_predictive_check_is_draw_linked(self) -> None:
        stan = self.public["models"]["stan"]
        check = stan["posteriorPredictiveCheck"]
        self.assertEqual(check["posteriorDrawCount"], 1000)
        self.assertEqual(check["heldOutSampleCount"], 1499)
        self.assertEqual(len(check["displayRows"]), 300)
        self.assertEqual(len(check["predictiveCountQ05"]), 300)
        self.assertEqual(len(check["predictiveCountMedian"]), 300)
        self.assertEqual(len(check["predictiveCountQ95"]), 300)
        self.assertTrue(
            all(
                low <= median <= high
                for low, median, high in zip(
                    check["predictiveCountQ05"],
                    check["predictiveCountMedian"],
                    check["predictiveCountQ95"],
                )
            )
        )
        total = check["totalCount"]
        self.assertLessEqual(total["q05"], total["median"])
        self.assertLessEqual(total["median"], total["q95"])
        coverage = check["intervalCoverage"]
        self.assertEqual(coverage["totalRows"], 1499)
        self.assertAlmostEqual(
            coverage["rate"], coverage["coveredRows"] / coverage["totalRows"], places=8
        )

    def test_nemos_basis_explorer_is_computed_but_not_fitted(self) -> None:
        explorer = self.public["models"]["nemos"]["basisExplorer"]
        self.assertEqual(explorer["status"], "computed")
        self.assertFalse(explorer["usedInFrozenFit"])
        self.assertEqual(len(explorer["inputGrid"]), 41)
        self.assertEqual(len(explorer["configurations"]), 6)
        for configuration in explorer["configurations"]:
            count = configuration["nBasisFunctions"]
            self.assertEqual(len(configuration["featureNames"]), count)
            self.assertEqual(len(configuration["curves"]), count)
            self.assertTrue(
                all(len(curve["values"]) == 41 for curve in configuration["curves"])
            )
            sample = configuration["designMatrixSample"]
            self.assertEqual(len(sample["input"]), 5)
            self.assertTrue(all(len(row) == count for row in sample["rows"]))

    def test_model_generator_provenance_hashes_match_sources(self) -> None:
        result = load_json(self.artifact_dir / "model-results.json")
        provenance = result["generatorProvenance"]
        self.assertIsNone(provenance["gitCommit"])
        expected_paths = {
            "scripts/run_models.py",
            "python/neurostack_explorer/modeling.py",
            "python/stan/poisson_encoding.stan",
            "requirements.lock",
        }
        self.assertEqual({item["path"] for item in provenance["files"]}, expected_paths)
        for item in provenance["files"]:
            self.assertEqual(item["sha256"], sha256(REPO_ROOT / item["path"]))

    def test_synthetic_models_remain_unfitted_and_explicit(self) -> None:
        for model in self.synthetic["models"].values():
            self.assertEqual(model["status"], "specification-only")
            self.assertFalse(model["artifactAvailable"])
            self.assertEqual(model["origin"], "illustrative")
            self.assertEqual(model["observed"], [])
            self.assertEqual(model["predicted"], [])
            self.assertIsNone(model["metricValue"])

    def test_bridge_and_plenoptic_fixtures_are_executed(self) -> None:
        bridge = load_json(self.artifact_dir / "bridgestan-surface.json")
        plenoptic = load_json(self.artifact_dir / "plenoptic-demo.json")
        self.assertEqual(bridge["status"], "computed")
        self.assertEqual(bridge["gradientCheck"]["status"], "passed")
        self.assertLessEqual(bridge["gradientCheck"]["maxAbsoluteError"], 1e-6)
        self.assertEqual(len(bridge["surface"]["axis"]), 17)
        self.assertEqual(plenoptic["status"], "computed")
        self.assertLess(
            plenoptic["synthesis"]["finalLoss"],
            plenoptic["synthesis"]["initialLoss"],
        )
        for field in ("png",):
            record = plenoptic["input"][field]
            self.assertEqual(
                record["sha256"], sha256(self.artifact_dir / record["path"])
            )
        for field in ("png", "differencePng", "representationDifferencePng"):
            record = plenoptic["synthesis"][field]
            self.assertEqual(
                record["sha256"], sha256(self.artifact_dir / record["path"])
            )
        self.assertEqual(len(plenoptic["synthesis"]["checkpoints"]), 9)
        for checkpoint in plenoptic["synthesis"]["checkpoints"]:
            record = checkpoint["png"]
            self.assertEqual(
                record["sha256"], sha256(self.artifact_dir / record["path"])
            )

    def test_centered_speed_and_spike_interpolation(self) -> None:
        timestamps = np.asarray([0.0, 1.0, 2.0, 3.0])
        x = timestamps**2
        y = np.zeros_like(x)
        speed = _compute_speed(timestamps, x, y)
        np.testing.assert_allclose(speed, [1.0, 2.0, 4.0, 5.0])
        sampled = _sample_speed_at_spikes(
            timestamps, speed, np.asarray([0.5, 1.5, 2.5])
        )
        np.testing.assert_allclose(sampled, [1.5, 3.0, 4.5])

    def test_predictive_speed_is_trailing_only(self) -> None:
        task = prepare_model_task(self.public)
        restored = task.x_train[:2] * task.feature_scale + task.feature_mean
        self.assertEqual(restored[0, 2], 0.0)
        expected_second_speed = (
            math.hypot(
                self.public["position"]["x"][1] - self.public["position"]["x"][0],
                self.public["position"]["y"][1] - self.public["position"]["y"][0],
            )
            / self.public["metadata"]["positionSampleIntervalSeconds"]
        )
        self.assertAlmostEqual(restored[1, 2], expected_second_speed, places=9)
        self.assertEqual(
            restored[0, 3], self.public["derived"]["unitRates"][0][0] * 0.1
        )

    def test_validator_cannot_be_disabled_with_python_optimization(self) -> None:
        completed = subprocess.run(
            [sys.executable, "-O", "scripts/validate_artifacts.py"],
            cwd=REPO_ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)

    def test_validation_discloses_source_findings(self) -> None:
        source = self.validation["source"]
        self.assertEqual(source["actualSha256"], ASSET_SHA256)
        self.assertEqual(source["pynwbSchemaValidation"]["status"], "passed")
        self.assertEqual(self.validation["overallAssessment"], "share-with-caveats")
        checks = {issue["check"] for issue in source["nwbInspector"]["issues"]}
        self.assertEqual(
            checks,
            {
                "check_regular_timestamps",
                "check_session_start_time_old_date",
                "check_subject_weight",
                "check_units_resolution_is_set",
            },
        )

    def test_provenance_does_not_treat_placeholder_as_date(self) -> None:
        caveats = " ".join(self.provenance["notes"])
        self.assertIn("placeholder", caveats)
        self.assertIn("Head direction", caveats)
        self.assertEqual(self.provenance["status"], "verified")
        self.assertEqual(self.provenance["privacyReview"]["status"], "passed")
        self.assertEqual(self.provenance["selectedAssets"][0]["sha256"], ASSET_SHA256)

    def test_notebook_inputs_are_complete_and_hash_linked(self) -> None:
        expected = {
            "public/artifacts/v1/demo-dataset.json": sha256(self.public_path),
            "public/artifacts/v1/synthetic-dataset.json": sha256(self.synthetic_path),
            "public/artifacts/v1/model-results.json": sha256(
                self.artifact_dir / "model-results.json"
            ),
            (
                "DANDI:000582/0.251111.2151/"
                "sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb"
            ): ASSET_SHA256,
        }
        observed = {
            item["reference"]: item["sha256"]
            for item in self.notebook_manifest["inputs"]
        }
        self.assertEqual(observed, expected)


if __name__ == "__main__":
    unittest.main()
