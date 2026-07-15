#!/usr/bin/env python3
"""Create the 15-section executable NeuroStack research notebook."""

from __future__ import annotations

from pathlib import Path

import nbformat as nbf

REPO_ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK_PATH = REPO_ROOT / "notebooks" / "neurostack_explorer.ipynb"


def markdown(text: str):
    return nbf.v4.new_markdown_cell(text.strip())


def code(text: str):
    return nbf.v4.new_code_cell(text.strip())


notebook = nbf.v4.new_notebook(
    metadata={
        "kernelspec": {
            "display_name": "Python 3 (NeuroStack target: 3.12)",
            "language": "python",
            "name": "python3",
        },
        "language_info": {"name": "python", "version": "3.12"},
        "neurostack": {
            "artifactSchemaVersion": "1.0.0",
            "source": "DANDI:000582/0.251111.2151",
            "assetUuid": "2b9e441b-56bc-4be2-893e-0e02d22d239d",
            "execution": "local deterministic analysis and artifact verification",
            "sectionCount": 15,
        },
    }
)

notebook.cells = [
    markdown(
        """
# 1. Project overview

**NeuroStack Explorer** is an educational technical demonstration by Fatgezim
“Zim” Bela. This notebook traces one pinned public NWB recording through
validation, Pynapple time-series objects, exploratory summaries, three fitted
Python model lanes, a Stan posterior artifact, and a Plotly figure.

It is not a medical device, diagnostic analysis, published study, or claim of
population generalization. The model task predicts one selected rat MEC unit's
next 100 ms spike count from four observational features in one recording.
"""
    ),
    code(
        """
from __future__ import annotations

import hashlib
import importlib.metadata
import json
import platform
import sys
from pathlib import Path

import numpy as np


def locate_repo_root() -> Path:
    for candidate in (Path.cwd(), *Path.cwd().parents):
        if (candidate / "public/artifacts/v1/demo-dataset.json").exists():
            return candidate
    raise FileNotFoundError("Run this notebook from inside the NeuroStack repository.")


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


ROOT = locate_repo_root()
sys.path.insert(0, str(ROOT / "python"))
ARTIFACT_DIR = ROOT / "public/artifacts/v1"
public = load_json(ARTIFACT_DIR / "demo-dataset.json")
synthetic = load_json(ARTIFACT_DIR / "synthetic-dataset.json")
model_results = load_json(ARTIFACT_DIR / "model-results.json")
print("Repository:", ROOT.name)
print("Scope: educational, nonclinical, one public recording")
"""
    ),
    markdown(
        """
## 2. Environment information

The notebook reports the runtime that executed these cells and the exact
installed scientific package versions. The repository lockfiles remain the
installation source of truth.
"""
    ),
    code(
        """
packages = [
    "pynwb", "pynapple", "nemos", "jax", "scikit-learn", "torch",
    "cmdstanpy", "bridgestan", "plenoptic", "plotly", "nbformat",
]
environment = {
    "python": platform.python_version(),
    "platform": platform.platform(),
    **{name: importlib.metadata.version(name) for name in packages},
}
assert sys.version_info[:2] == (3, 12)
for name, version in environment.items():
    print(f"{name}: {version}")
"""
    ),
    markdown(
        """
## 3. Dataset provenance

The selected source is DANDI `000582`, published version
`0.251111.2151`, exact asset UUID
`2b9e441b-56bc-4be2-893e-0e02d22d239d`, licensed CC BY 4.0. The
15,657,857-byte source remains in a user cache; the repository ships a compact,
declared derivative rather than silently presenting it as the untouched NWB.
"""
    ),
    code(
        """
EXPECTED_ASSET_UUID = "2b9e441b-56bc-4be2-893e-0e02d22d239d"
EXPECTED_SOURCE_SHA256 = "43b3b435b953d22e276acc494af2926b63deaf15d2834531b2a87d08a8458a09"
assert public["metadata"]["assetUuid"] == EXPECTED_ASSET_UUID
assert public["metadata"]["sha256"] == EXPECTED_SOURCE_SHA256
assert public["metadata"]["license"] == "CC-BY-4.0"
assert synthetic["metadata"]["origin"] == "synthetic"
assert synthetic["metadata"]["assetUuid"] is None
print("Dataset:", public["metadata"]["datasetId"])
print("Source SHA-256:", public["metadata"]["sha256"])
print("Derivative SHA-256:", sha256(ARTIFACT_DIR / "demo-dataset.json"))
print("Synthetic fallback remains separate:", synthetic["metadata"]["datasetId"])
"""
    ),
    markdown(
        """
## 4. NWB loading

The source is opened locally only after exact byte-size and SHA-256 checks.
PyNWB reads the NWB object graph; this cell neither downloads nor modifies it.
"""
    ),
    code(
        """
from neurostack_explorer.artifacts import extract_source_recording, fetch_verified_source

source_path = fetch_verified_source(allow_download=False)
recording = extract_source_recording(source_path)
assert sha256(source_path) == EXPECTED_SOURCE_SHA256
print("Loaded:", source_path.name)
print("NWB identifier:", recording.nwb_identifier)
print("NWB version:", recording.nwb_version)
print("Position samples:", recording.source_position_sample_count)
print("Selected unit IDs:", [unit["id"] for unit in recording.units])
"""
    ),
    markdown(
        """
## 5. Data validation

Validation checks the NWB schema, monotonic timestamps, finite x/y values,
declared 600-second support, expected unit IDs, and spike-time bounds. The
source's 1900 session date is treated as a placeholder; only LED1 x/y tracking
is used, so this project does not claim head-direction analysis.
"""
    ),
    code(
        """
timestamps = recording.position_timestamps
assert recording.schema_validation_errors == ()
assert len(timestamps) == 30_000
assert np.all(np.diff(timestamps) > 0)
assert np.all(np.isfinite(recording.position_x_meters))
assert np.all(np.isfinite(recording.position_y_meters))
assert [unit["id"] for unit in recording.units] == public["metadata"]["unitIds"]
assert sum(len(unit["spike_times"]) for unit in recording.units) == 9_087
print("PyNWB schema errors: 0")
print("Monotonic finite position samples: 30,000")
print("Retained selected spikes: 9,087")
"""
    ),
    markdown(
        """
## 6. Pynapple conversion

Pynapple represents timestamped x/y values and unit-keyed spike events with an
explicit support interval. A 100 ms count vector is independently checked
against the browser artifact before it becomes a model feature or target.
"""
    ),
    code(
        """
import pynapple as nap

support = nap.IntervalSet(start=0.0, end=600.0, time_units="s")
position = nap.TsdFrame(
    t=recording.position_timestamps[::5],
    d=np.column_stack([
        recording.position_x_meters[::5],
        recording.position_y_meters[::5],
    ]),
    columns=["x_m", "y_m"],
    time_support=support,
    time_units="s",
)
spikes = nap.TsGroup({
    index: nap.Ts(t=unit["spike_times"], time_support=support, time_units="s")
    for index, unit in enumerate(recording.units)
})
t1c1_counts = np.asarray(spikes[0].count(0.1, ep=support, time_units="s"), dtype=float)
serialized_counts = np.asarray(public["derived"]["unitRates"][0], dtype=float) * 0.1
assert position.shape == (6_000, 2)
assert np.array_equal(t1c1_counts, serialized_counts)
print("Pynapple position shape:", position.shape)
print("Pynapple spike group size:", len(spikes))
print("100 ms t1c1 count bins verified:", len(t1c1_counts))
"""
    ),
    markdown(
        """
## 7. Exploratory analysis

These are transparent descriptive summaries, not inferential findings. Speed
tuning retains occupancy alongside rate; event-pair lag counts do not establish
connectivity; a feature embedding does not imply anatomy.
"""
    ),
    code(
        """
duration_seconds = public["metadata"]["durationSeconds"]
total_spikes = sum(unit["spikeCount"] for unit in public["units"])
mean_rate_hz = total_spikes / (len(public["units"]) * duration_seconds)
occupancy = np.asarray(public["derived"]["tuning"]["occupancy"], dtype=float)
tuning_rate = np.asarray(public["derived"]["tuning"]["rate"], dtype=float)
assert total_spikes == 9_087
assert np.all(occupancy >= 0) and np.all(tuning_rate >= 0)
print(f"Across-unit mean rate: {mean_rate_hz:.3f} spikes/second/unit")
print("Tuning bins with occupancy:", int(np.count_nonzero(occupancy)))
print("Interpretation boundary: descriptive, one session")
"""
    ),
    markdown(
        """
## 8. NeMoS model

NeMoS fits a Poisson GLM to the frozen training block. The four features are x,
y, trailing-only speed, and current-bin t1c1 count; the target is the next-bin
count. Standardization uses training rows only. Basis curves shown by the site
are a separate version-locked explorer and are not retroactively described as
part of this raw-feature fit.
"""
    ),
    code(
        """
from neurostack_explorer.modeling import fit_nemos, prepare_model_task

task = prepare_model_task(public)
nemos_refit = fit_nemos(task)
committed_nemos = model_results["models"]["nemos"]
assert nemos_refit["metricValue"] == committed_nemos["metricValue"]
assert nemos_refit["coefficients"] == committed_nemos["coefficients"]
print("NeMoS final-test mean Poisson deviance:", nemos_refit["metricValue"])
print("Coefficients:", nemos_refit["coefficients"])
print("Pynapple input-count verification:", task.pynapple_count_verified)
"""
    ),
    markdown(
        """
## 9. scikit-learn comparison

The scikit-learn lane uses the same target, rows, split, preprocessing, and
metric as NeMoS. Any recorded training-only cross-validation audit and naive
baseline are reported without selecting a winner from the final test.
"""
    ),
    code(
        """
from neurostack_explorer.modeling import fit_sklearn

sklearn_refit = fit_sklearn(task)
committed_sklearn = model_results["models"]["sklearn"]
assert sklearn_refit["metricValue"] == committed_sklearn["metricValue"]
assert sklearn_refit["coefficients"] == committed_sklearn["coefficients"]
print("scikit-learn final-test mean Poisson deviance:", sklearn_refit["metricValue"])
print("Validation mean Poisson deviance:", sklearn_refit["validationMetricValue"])
print("Leakage boundary:", model_results["task"]["preprocessing"])
"""
    ),
    markdown(
        """
## 10. PyTorch model

A small deterministic CPU network provides a nonlinear comparison. The model
record declares architecture selection, early stopping, and all stored
architecture comparisons; it does not imply that deep learning is generally
superior.
"""
    ),
    code(
        """
from neurostack_explorer.modeling import fit_pytorch

pytorch_refit = fit_pytorch(task)
committed_pytorch = model_results["models"]["pytorch"]
assert pytorch_refit["metricValue"] == committed_pytorch["metricValue"]
assert pytorch_refit["configuration"] == committed_pytorch["configuration"]
print("PyTorch final-test mean Poisson deviance:", pytorch_refit["metricValue"])
print("Selected architecture:", pytorch_refit["configuration"]["architecture"])
print("Best validation epoch:", pytorch_refit["configuration"]["bestEpoch"])
"""
    ),
    markdown(
        """
## 11. Stan uncertainty example

Stan samples a Poisson-log model with explicit weakly informative priors. The
committed posterior record contains diagnostics, 90% credible intervals, and a
deterministic posterior-predictive check. Credible intervals are not confidence
intervals, and all interpretation is conditional on this model and its priors.
"""
    ),
    code(
        """
stan = model_results["models"]["stan"]
stan_source = (ROOT / "python/stan/poisson_encoding.stan").read_text(encoding="utf-8")
assert "poisson_log" in stan_source
assert stan["diagnostics"]["divergentTransitions"] == 0
assert stan["diagnostics"]["maxRHat"] < 1.05
print("Stan source SHA-256:", sha256(ROOT / "python/stan/poisson_encoding.stan"))
print("Maximum R-hat:", stan["diagnostics"]["maxRHat"])
print("Minimum bulk ESS:", stan["diagnostics"]["minBulkEss"])
print("Posterior parameters:", [row["parameter"] for row in stan["posteriorSummary"]])
if "posteriorPredictiveCheck" in stan:
    print("Posterior-predictive interval coverage:", stan["posteriorPredictiveCheck"]["intervalCoverage"])
print("Stored posterior display draws:", stan["posteriorDrawSamples"]["displayDrawCount"])
"""
    ),
    markdown(
        """
## 12. Plotly visualization

This output is a real Plotly figure backed by the committed speed-tuning and
occupancy arrays. It includes units, legend labels, hover data, and a text
summary in the website. The notebook stores Plotly's deterministic MIME bundle,
not a screenshot.
"""
    ),
    code(
        """
import plotly.graph_objects as go
from IPython.display import display

figure = go.Figure()
figure.add_trace(go.Scatter(
    x=public["derived"]["tuning"]["bins"],
    y=public["derived"]["tuning"]["rate"],
    mode="lines+markers",
    name="t1c1 firing rate",
))
figure.add_trace(go.Bar(
    x=public["derived"]["tuning"]["bins"],
    y=public["derived"]["tuning"]["occupancy"],
    name="occupancy",
    yaxis="y2",
    opacity=0.35,
))
figure.update_layout(
    title="Occupancy-aware t1c1 speed tuning",
    xaxis_title="Speed (m/s)",
    yaxis_title="Firing rate (Hz)",
    yaxis2={"title": "Occupancy (s)", "overlaying": "y", "side": "right"},
    template="plotly_white",
)
display({"application/vnd.plotly.v1+json": figure.to_plotly_json()}, raw=True)
print(public["accessibleSummaries"]["tuning"])
"""
    ),
    markdown(
        """
## 13. Results

All aligned lanes below use the same 1,499-row final-test block and mean
Poisson deviance (lower is better). This is a one-split engineering comparison,
not a benchmark ranking or evidence that one model class is universally best.
"""
    ),
    code(
        """
rows = [
    (name, record["metricValue"], record["validationMetricValue"])
    for name, record in model_results["models"].items()
]
print("model | final-test mean Poisson deviance | validation deviance")
for name, final_metric, validation_metric in rows:
    print(f"{name:8s} | {final_metric:.6f} | {validation_metric:.6f}")
assert all(record["origin"] == "public-derived" for record in model_results["models"].values())
assert all(record["execution"] == "precomputed" for record in model_results["models"].values())
"""
    ),
    markdown(
        """
## 14. Limitations

- One rat MEC LII recording and one selected unit cannot establish population,
  species, human, patient, or clinical generalization.
- LED1 x/y is the only reviewed behavioral series; head direction is not used.
- Predictive associations and cross-correlations do not establish causality,
  connectivity, neural mechanism, or navigation strategy.
- The final test is one chronological split, not a multi-session benchmark.
- Stan intervals are conditional on the declared likelihood, priors, feature
  timing, and training subsample.
- The compact derivative is transformed and decimated; its exact generation
  script and source identity are retained.
- BridgeStan and plenoptic are separate illustrative interface artifacts, not
  additional estimators on the aligned neural prediction task.
"""
    ),
    markdown(
        """
## 15. Reproduction instructions

Run the commands below from a clean clone after creating the exact Python 3.12
environment. Public-data acquisition is explicit and checksum-gated; no source
NWB is committed. Model fitting and visual-model synthesis occur offline, never
in a visitor's browser.
"""
    ),
    code(
        """
commands = [
    "npm ci",
    "python3.12 -m venv .venv && .venv/bin/pip install -r requirements.lock",
    "NEUROSTACK_DATASET_STATUS=verified NEUROSTACK_ALLOW_PUBLIC_DATA_FETCH=true make fetch-data PYTHON=.venv/bin/python",
    ".venv/bin/python scripts/validate_nwb.py --inspect",
    ".venv/bin/python scripts/run_models.py",
    ".venv/bin/python scripts/generate_bridgestan_demo.py",
    ".venv/bin/python scripts/generate_plenoptic_demo.py",
    "make notebook PYTHON=.venv/bin/python",
    ".venv/bin/python scripts/build_artifacts.py --inspect",
    "make verify PYTHON=.venv/bin/python",
]
print("Reproduction sequence:")
for command in commands:
    print("  " + command)
print("requirements.lock SHA-256:", sha256(ROOT / "requirements.lock"))
print("model-results.json SHA-256:", sha256(ARTIFACT_DIR / "model-results.json"))
"""
    ),
]

for index, cell in enumerate(notebook.cells, start=1):
    # nbformat otherwise assigns random cell IDs, defeating byte stability.
    cell["id"] = f"neurostack-{index:02d}"

NOTEBOOK_PATH.parent.mkdir(parents=True, exist_ok=True)
nbf.write(notebook, NOTEBOOK_PATH)
print(NOTEBOOK_PATH)
