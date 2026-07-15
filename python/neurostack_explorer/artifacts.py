"""Verified NWB ingestion and compact deterministic web-artifact generation."""

from __future__ import annotations

import hashlib
import importlib.metadata
import json
import math
import os
import platform
import random
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import numpy as np

from .constants import (
    ACCESS_DATE,
    ARTIFACT_SCHEMA_VERSION,
    ARTIFACT_VERSION,
    ASSET_API,
    ASSET_DANDI_URI,
    ASSET_DOWNLOAD_URL,
    ASSET_NAME,
    ASSET_PATH,
    ASSET_SHA256,
    ASSET_SIZE_BYTES,
    ASSET_UUID,
    BRAIN_REGION,
    DANDISET_API,
    DANDISET_DOI,
    DANDISET_ID,
    DANDISET_PAGE,
    DANDISET_TITLE,
    DANDISET_VERSION,
    DATASET_LICENSE,
    DATASET_LICENSE_URL,
    DATASET_AUTHORS,
    DEFAULT_BUILD_TIMESTAMP,
    DEFAULT_CACHE_DIR,
    DERIVATIVE_POSITION_INTERVAL_SECONDS,
    EXPECTED_DERIVATIVE_POSITION_SAMPLES,
    EXPECTED_DURATION_SECONDS,
    EXPECTED_POSITION_SAMPLES,
    EXPECTED_UNIT_IDS,
    PIPELINE_SEED,
    POSITION_DECIMATION_FACTOR,
    POSITION_SERIES_PATH,
    RECORDING_MODALITY,
    SOURCE_PAPER_DOI,
    SOURCE_POSITION_INTERVAL_SECONDS,
    SPECIES,
    SPIKE_BIN_SECONDS,
)


class PipelineError(RuntimeError):
    """Raised when a source or derivative invariant fails closed."""


@dataclass(frozen=True)
class SourceRecording:
    """Reviewed variables extracted from the pinned source NWB file."""

    position_timestamps: np.ndarray
    position_x_meters: np.ndarray
    position_y_meters: np.ndarray
    units: tuple[dict[str, Any], ...]
    nwb_identifier: str
    nwb_version: str
    source_position_unit: str
    source_position_conversion: float
    source_position_offset: float
    source_position_sample_count: int
    electrode_count: int
    lfp_sample_rate_hz: float
    schema_validation_errors: tuple[str, ...]


def build_timestamp() -> str:
    """Return the normalized timestamp used in deterministic release artifacts."""

    return os.environ.get("NEUROSTACK_BUILD_TIMESTAMP", DEFAULT_BUILD_TIMESTAMP)


def sha256_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _round_array(values: np.ndarray, digits: int = 6) -> list[float]:
    rounded = np.round(np.asarray(values, dtype=float), digits)
    return [float(value) for value in rounded.tolist()]


def _canonical_bytes(payload: Any) -> bytes:
    return (
        json.dumps(
            payload,
            ensure_ascii=False,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        + "\n"
    ).encode("utf-8")


def model_input_fingerprint(artifact: dict[str, Any]) -> str:
    """Hash only the declared model inputs, independent of fitted outputs."""

    payload = {
        "taskVersion": "next-bin-count-v2",
        "features": ["x", "y", "trailing-speed", "current-unit-count"],
        "split": {
            "train": [0, 3600],
            "validation": [3600, 4200],
            "gap": [4200, 4500],
            "test": [4500, 5999],
        },
        "speedFeature": "trailing finite difference from current and prior x/y samples",
        "binSizeSeconds": artifact["derived"]["binSizeSeconds"],
        "unitId": artifact["metadata"]["unitIds"][0],
        "timestamps": artifact["position"]["timestamps"],
        "x": artifact["position"]["x"],
        "y": artifact["position"]["y"],
        "speed": artifact["position"]["speed"],
        "selectedUnitRate": artifact["derived"]["unitRates"][0],
    }
    return hashlib.sha256(_canonical_bytes(payload)).hexdigest()


def write_json(path: Path, payload: Any, *, compact: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if compact:
        encoded = _canonical_bytes(payload)
    else:
        encoded = (
            json.dumps(
                payload,
                ensure_ascii=False,
                allow_nan=False,
                sort_keys=True,
                indent=2,
            )
            + "\n"
        ).encode("utf-8")
    path.write_bytes(encoded)


def fetch_verified_source(
    cache_dir: Path = DEFAULT_CACHE_DIR,
    *,
    allow_download: bool = True,
) -> Path:
    """Return the pinned NWB asset, downloading only when explicitly allowed."""

    cache_dir.mkdir(parents=True, exist_ok=True)
    destination = cache_dir / ASSET_NAME
    if destination.exists():
        _assert_source_identity(destination)
        return destination
    if not allow_download:
        raise PipelineError(
            f"Pinned source is absent from {cache_dir}; rerun with download enabled."
        )

    temporary = destination.with_suffix(destination.suffix + ".part")
    request = urllib.request.Request(
        ASSET_DOWNLOAD_URL,
        headers={"User-Agent": "NeuroStack-Explorer-artifact-builder/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:  # noqa: S310
            with temporary.open("wb") as handle:
                shutil.copyfileobj(response, handle, length=1024 * 1024)
        _assert_source_identity(temporary)
        temporary.replace(destination)
    finally:
        if temporary.exists():
            temporary.unlink()
    return destination


def _assert_source_identity(path: Path) -> None:
    actual_size = path.stat().st_size
    if actual_size != ASSET_SIZE_BYTES:
        raise PipelineError(
            f"Source byte-size mismatch: expected {ASSET_SIZE_BYTES}, got {actual_size}."
        )
    actual_hash = sha256_path(path)
    if actual_hash != ASSET_SHA256:
        raise PipelineError(
            f"Source SHA-256 mismatch: expected {ASSET_SHA256}, got {actual_hash}."
        )


def _decode_text(value: Any) -> str:
    return value.decode("utf-8") if isinstance(value, bytes) else str(value)


def extract_source_recording(source_path: Path) -> SourceRecording:
    """Validate and extract the reviewed NWB variables without mutating the file."""

    _assert_source_identity(source_path)

    import h5py  # type: ignore[import-untyped]
    from pynwb import NWBHDF5IO, validate  # type: ignore[import-untyped]

    schema_errors = tuple(str(error) for error in validate(path=source_path))
    if schema_errors:
        raise PipelineError(
            "PyNWB schema validation failed: " + "; ".join(schema_errors)
        )

    with h5py.File(source_path, "r") as h5_file:
        nwb_version = _decode_text(h5_file.attrs.get("nwb_version", "unknown"))

    with NWBHDF5IO(source_path, "r", load_namespaces=True) as io:
        nwb_file = io.read()
        try:
            position = nwb_file.processing["behavior"]["Position"].spatial_series[
                "SpatialSeriesLED1"
            ]
        except KeyError as exc:
            raise PipelineError(
                f"Required series {POSITION_SERIES_PATH} was not found."
            ) from exc

        timestamps = np.asarray(position.timestamps[:], dtype=np.float64)
        position_data = np.asarray(position.data[:], dtype=np.float64)
        if position_data.ndim != 2 or position_data.shape[1] < 2:
            raise PipelineError("Expected SpatialSeriesLED1 to contain x/y columns.")
        conversion = float(position.conversion)
        offset = float(position.offset)
        # NWB stores raw values with a declared conversion and offset. Apply each
        # exactly once before selecting the x/y derivative.
        converted = position_data[:, :2] * conversion + offset

        unit_names = [_decode_text(item) for item in nwb_file.units["unit_name"][:]]
        units: list[dict[str, Any]] = []
        for index, unit_name in enumerate(unit_names):
            spike_times = np.asarray(
                nwb_file.units.get_unit_spike_times(index), dtype=np.float64
            )
            units.append({"id": unit_name, "spike_times": spike_times})

        lfp = nwb_file.processing["ecephys"]["LFP"].electrical_series[
            "ElectricalSeriesLFP"
        ]
        electrode_count = len(nwb_file.electrodes)
        lfp_rate_hz = float(lfp.rate)

        recording = SourceRecording(
            position_timestamps=timestamps,
            position_x_meters=converted[:, 0],
            position_y_meters=converted[:, 1],
            units=tuple(units),
            nwb_identifier=str(nwb_file.identifier),
            nwb_version=nwb_version,
            source_position_unit=str(position.unit),
            source_position_conversion=conversion,
            source_position_offset=offset,
            source_position_sample_count=int(timestamps.size),
            electrode_count=electrode_count,
            lfp_sample_rate_hz=lfp_rate_hz,
            schema_validation_errors=schema_errors,
        )

    validate_source_recording(recording)
    return recording


def validate_source_recording(recording: SourceRecording) -> None:
    timestamps = recording.position_timestamps
    if recording.source_position_sample_count != EXPECTED_POSITION_SAMPLES:
        raise PipelineError(
            "Unexpected position sample count: "
            f"{recording.source_position_sample_count}."
        )
    if tuple(unit["id"] for unit in recording.units) != EXPECTED_UNIT_IDS:
        raise PipelineError("Pinned source unit identifiers changed unexpectedly.")
    for label, values in (
        ("position timestamps", timestamps),
        ("position x", recording.position_x_meters),
        ("position y", recording.position_y_meters),
    ):
        if not np.all(np.isfinite(values)):
            raise PipelineError(f"{label} contains NaN or infinite values.")
    if not np.all(np.diff(timestamps) > 0):
        raise PipelineError("Position timestamps are not strictly increasing.")
    if not math.isclose(float(timestamps[0]), 0.0, abs_tol=1e-9):
        raise PipelineError("Position time support does not begin at 0 seconds.")
    if not math.isclose(
        float(timestamps[-1] + SOURCE_POSITION_INTERVAL_SECONDS),
        EXPECTED_DURATION_SECONDS,
        abs_tol=1e-6,
    ):
        raise PipelineError("Position time support does not cover 600 seconds.")
    for unit in recording.units:
        spikes = np.asarray(unit["spike_times"], dtype=float)
        if spikes.size == 0 or not np.all(np.isfinite(spikes)):
            raise PipelineError(f"Unit {unit['id']} has missing or invalid spikes.")
        if not np.all(np.diff(spikes) > 0):
            raise PipelineError(f"Unit {unit['id']} spikes are not increasing.")
        if spikes[0] < 0 or spikes[-1] > EXPECTED_DURATION_SECONDS:
            raise PipelineError(f"Unit {unit['id']} has spikes outside support.")


def _compute_speed(timestamps: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    if np.any(np.diff(timestamps) <= 0):
        raise PipelineError("Cannot compute speed from non-increasing timestamps.")
    velocity_x = np.gradient(x, timestamps)
    velocity_y = np.gradient(y, timestamps)
    return np.hypot(velocity_x, velocity_y)


def _sample_speed_at_spikes(
    timestamps: np.ndarray, speed: np.ndarray, spike_times: np.ndarray
) -> np.ndarray:
    """Linearly interpolate sample-centered speed at each spike timestamp."""

    return np.interp(spike_times, timestamps, speed, left=speed[0], right=speed[-1])


def _bin_unit_spikes(
    units: Iterable[dict[str, Any]],
    *,
    duration_seconds: float,
    bin_size_seconds: float,
) -> tuple[np.ndarray, dict[str, np.ndarray], np.ndarray]:
    bin_count = int(round(duration_seconds / bin_size_seconds))
    edges = np.linspace(0.0, duration_seconds, bin_count + 1, dtype=np.float64)
    centers = edges[:-1] + bin_size_seconds / 2.0
    unit_rates: dict[str, np.ndarray] = {}
    count_arrays: list[np.ndarray] = []
    for unit in units:
        counts, _ = np.histogram(unit["spike_times"], bins=edges)
        count_arrays.append(counts)
        unit_rates[str(unit["id"])] = counts.astype(np.float64) / bin_size_seconds
    stacked = np.stack(count_arrays, axis=0)
    population_rate = stacked.sum(axis=0) / (stacked.shape[0] * bin_size_seconds)
    return centers, unit_rates, population_rate


def _speed_tuning(
    timestamps: np.ndarray,
    speed: np.ndarray,
    spike_times: np.ndarray,
    *,
    sample_interval_seconds: float,
    bin_count: int = 20,
) -> dict[str, Any]:
    positive_limit = float(np.quantile(speed, 0.99))
    if positive_limit <= 0:
        positive_limit = 1.0
    edges = np.linspace(0.0, positive_limit, bin_count + 1)
    clipped_speed = np.clip(speed, edges[0], np.nextafter(edges[-1], edges[0]))
    occupancy_counts, _ = np.histogram(clipped_speed, bins=edges)
    occupancy_seconds = occupancy_counts.astype(float) * sample_interval_seconds

    spike_speeds = np.clip(
        _sample_speed_at_spikes(timestamps, speed, spike_times),
        edges[0],
        np.nextafter(edges[-1], edges[0]),
    )
    spike_counts, _ = np.histogram(spike_speeds, bins=edges)
    rates = np.divide(
        spike_counts,
        occupancy_seconds,
        out=np.zeros_like(occupancy_seconds, dtype=float),
        where=occupancy_seconds > 0,
    )
    centers = (edges[:-1] + edges[1:]) / 2.0
    return {
        "variable": "derived speed",
        "unit": "meters/second",
        "bins": _round_array(centers, 5),
        "binEdges": _round_array(edges, 5),
        "occupancy": _round_array(occupancy_seconds, 3),
        "occupancyUnit": "seconds",
        "rate": _round_array(rates, 5),
        "rateUnit": "spikes/second",
        "upperEdgeRule": "99th-percentile speed; larger values are clamped to the final bin",
    }


def _isi_histogram(spike_times: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    edges = np.linspace(0.0, 2.0, 41)
    counts, _ = np.histogram(np.diff(spike_times), bins=edges)
    centers = (edges[:-1] + edges[1:]) / 2.0
    return centers, counts


def _cross_correlogram(
    first: np.ndarray,
    second: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    window_seconds = 0.25
    bin_seconds = 0.01
    edges = np.arange(
        -window_seconds,
        window_seconds + bin_seconds * 0.5,
        bin_seconds,
    )
    lag_parts: list[np.ndarray] = []
    for timestamp in first:
        lower = np.searchsorted(second, timestamp - window_seconds, side="left")
        upper = np.searchsorted(second, timestamp + window_seconds, side="right")
        lag_parts.append(second[lower:upper] - timestamp)
    lags = np.concatenate(lag_parts) if lag_parts else np.array([], dtype=float)
    counts, _ = np.histogram(lags, bins=edges)
    centers = (edges[:-1] + edges[1:]) / 2.0
    return centers, counts


def _descriptive_embedding(
    units: Iterable[dict[str, Any]], duration_seconds: float
) -> dict[str, Any]:
    unit_list = list(units)
    mean_rates = np.array(
        [len(unit["spike_times"]) / duration_seconds for unit in unit_list],
        dtype=float,
    )
    isi_cv = []
    for unit in unit_list:
        intervals = np.diff(unit["spike_times"])
        isi_cv.append(float(np.std(intervals) / np.mean(intervals)))
    isi_cv_array = np.asarray(isi_cv, dtype=float)

    def zscore(values: np.ndarray) -> np.ndarray:
        standard_deviation = float(np.std(values))
        if standard_deviation == 0:
            return np.zeros_like(values)
        return (values - np.mean(values)) / standard_deviation

    return {
        "x": _round_array(zscore(mean_rates), 5),
        "y": _round_array(zscore(isi_cv_array), 5),
        "unitId": [str(unit["id"]) for unit in unit_list],
        "method": (
            "Descriptive feature map: x is z-scored mean firing rate and y is "
            "z-scored inter-spike-interval coefficient of variation. This is "
            "not a learned low-dimensional embedding."
        ),
    }


def _model_specifications() -> dict[str, Any]:
    common = {
        "status": "specification-only",
        "origin": "illustrative",
        "execution": "precomputed",
        "artifactAvailable": False,
        "target": "100 ms spike count per unit",
        "splitStrategy": (
            "Contiguous time blocks with a temporal gap; preprocessing fit on "
            "training blocks only."
        ),
        "observed": [],
        "predicted": [],
        "predictions": [],
        "metricLabel": "Mean Poisson deviance",
        "metricValue": None,
        "metrics": [],
    }
    return {
        "nemos": {
            **common,
            "label": "NeMoS Poisson GLM",
            "versionPin": "0.2.9",
            "family": "Poisson generalized linear model",
            "disclosure": (
                "No NeMoS model was fit for this lightweight artifact build. A "
                "release result requires a locked JAX/NeMoS fixture, held-out "
                "predictions, diagnostics, and rerunnable command."
            ),
        },
        "sklearn": {
            **common,
            "label": "scikit-learn PoissonRegressor",
            "versionPin": "1.9.0",
            "family": "PoissonRegressor baseline",
            "disclosure": (
                "No scikit-learn estimator was fit for this artifact. It remains "
                "a reviewed comparison specification, not a performance result."
            ),
        },
        "pytorch": {
            **common,
            "label": "PyTorch Poisson MLP",
            "versionPin": "2.12.1 compatibility lane",
            "family": "Compact Poisson multilayer perceptron",
            "disclosure": (
                "No PyTorch network was trained for this artifact. A future "
                "fixture must record architecture, CPU device, optimizer, epochs, "
                "determinism settings, and held-out predictions."
            ),
        },
        "stan": {
            **common,
            "label": "Stan uncertainty lane",
            "versionPin": "CmdStanPy 1.3.0 / CmdStan 2.39.0",
            "family": "Bayesian count-model uncertainty analysis",
            "disclosure": (
                "No posterior samples or BridgeStan gradients are included. "
                "Stan compilation and sampling require separate reviewed fixtures; "
                "BridgeStan is an interface demonstration, not another estimator."
            ),
        },
    }


def _build_artifact(
    *,
    metadata: dict[str, Any],
    timestamps: np.ndarray,
    x: np.ndarray,
    y: np.ndarray,
    units: tuple[dict[str, Any], ...],
    origin: str,
) -> dict[str, Any]:
    speed = _compute_speed(timestamps, x, y)
    duration_seconds = float(metadata["durationSeconds"])
    time_bins, unit_rates, population_rate = _bin_unit_spikes(
        units,
        duration_seconds=duration_seconds,
        bin_size_seconds=SPIKE_BIN_SECONDS,
    )
    selected_unit = units[0]
    isi_bins, isi_counts = _isi_histogram(selected_unit["spike_times"])
    cross_first = units[0]
    cross_second = units[1]
    cross_bins, cross_counts = _cross_correlogram(
        cross_first["spike_times"], cross_second["spike_times"]
    )
    tuning = _speed_tuning(
        timestamps,
        speed,
        selected_unit["spike_times"],
        sample_interval_seconds=float(metadata["positionSampleIntervalSeconds"]),
    )
    tuning["unitId"] = str(selected_unit["id"])

    spike_counts = {unit["id"]: len(unit["spike_times"]) for unit in units}
    total_spikes = sum(spike_counts.values())
    mean_rate = total_spikes / (len(units) * duration_seconds)

    return {
        "schemaVersion": ARTIFACT_SCHEMA_VERSION,
        "metadata": metadata,
        "position": {
            "timestamps": _round_array(timestamps, 3),
            "x": _round_array(x, 5),
            "y": _round_array(y, 5),
            "speed": _round_array(speed, 5),
            "coordinateUnit": "meters",
            "speedUnit": "meters/second",
            "speedMethod": (
                "Speed magnitude from sample-centered finite differences of x/y "
                "position (NumPy gradient; one-sided at endpoints). Speed is "
                "linearly interpolated at spike timestamps for tuning calculations."
            ),
        },
        "units": [
            {
                "id": str(unit["id"]),
                "spikeTimes": _round_array(unit["spike_times"], 6),
                "spikeTimeUnit": "seconds",
                "spikeCount": len(unit["spike_times"]),
            }
            for unit in units
        ],
        "derived": {
            "binSizeSeconds": SPIKE_BIN_SECONDS,
            "timeBins": _round_array(time_bins, 3),
            "populationRate": _round_array(population_rate, 5),
            "populationRateUnit": "mean spikes/second/unit",
            "unitRates": [
                _round_array(unit_rates[str(unit["id"])], 5) for unit in units
            ],
            "unitRateUnit": "spikes/second",
            "tuning": tuning,
            "isiUnitId": str(selected_unit["id"]),
            "isiBins": _round_array(isi_bins, 4),
            "isiCounts": [int(value) for value in isi_counts.tolist()],
            "isiBinUnit": "seconds",
            "isiRangeDisclosure": "Only inter-spike intervals from 0 to 2 seconds are counted.",
            "crossUnitIds": [str(cross_first["id"]), str(cross_second["id"])],
            "crossLagBins": _round_array(cross_bins, 4),
            "crossCounts": [int(value) for value in cross_counts.tolist()],
            "crossLagUnit": "seconds",
            "crossDisclosure": (
                "Counts are event-pair lags within ±0.25 seconds; they do not "
                "establish connectivity or causality."
            ),
            "embedding": _descriptive_embedding(units, duration_seconds),
        },
        "models": _model_specifications(),
        "accessibleSummaries": {
            "raster": (
                f"{len(units)} sorted units contribute {total_spikes:,} spikes "
                f"over {duration_seconds:.0f} seconds; the across-unit mean rate "
                f"is {mean_rate:.2f} spikes per second per unit."
            ),
            "heatmap": (
                f"The rate heatmap contains {len(units)} unit rows and "
                f"{len(time_bins):,} fixed {SPIKE_BIN_SECONDS:.1f}-second bins."
            ),
            "behavior": (
                f"Position contains {len(timestamps):,} derivative samples at "
                f"{metadata['positionSampleIntervalSeconds']:.2f}-second intervals "
                "with coordinates in meters."
            ),
            "tuning": (
                f"The speed-tuning table uses {selected_unit['id']} and includes "
                "occupancy seconds beside every firing-rate bin."
            ),
            "isi": (
                f"The inter-spike interval histogram describes {selected_unit['id']} "
                "between zero and two seconds."
            ),
            "correlation": (
                f"The cross-correlogram counts event-pair lags for {cross_first['id']} "
                f"and {cross_second['id']} within plus or minus 0.25 seconds; it "
                "does not establish connectivity."
            ),
            "prediction": (
                "Held-out observed and predicted next-bin counts are shown only for "
                "a fitted, checksummed model artifact."
            ),
            "residual": (
                "Residuals are observed minus predicted held-out 100-millisecond "
                "spike counts."
            ),
            "embedding": (
                "The two-dimensional unit feature map uses standardized mean firing "
                "rate and inter-spike-interval variability; distance is descriptive."
            ),
            "comparison": (
                "Model scores use the same held-out target, chronological split, and "
                "mean Poisson deviance definition; lower is better."
            ),
            "provenance": (
                "This artifact is a transformed, precomputed derivative; it is "
                "not the untouched NWB source file."
                if origin == "public-derived"
                else "This is deterministic synthetic data, not a biological recording."
            ),
        },
    }


def build_public_artifact(recording: SourceRecording) -> dict[str, Any]:
    selection = slice(None, None, POSITION_DECIMATION_FACTOR)
    timestamps = recording.position_timestamps[selection]
    x = recording.position_x_meters[selection]
    y = recording.position_y_meters[selection]
    if len(timestamps) != EXPECTED_DERIVATIVE_POSITION_SAMPLES:
        raise PipelineError("Unexpected derivative position sample count.")

    metadata = {
        "origin": "public-derived",
        "execution": "precomputed",
        "status": "computed",
        "datasetId": f"DANDI:{DANDISET_ID}/{DANDISET_VERSION}",
        "datasetTitle": DANDISET_TITLE,
        "authors": list(DATASET_AUTHORS),
        "permanentIdentifier": DANDISET_DOI,
        "repositoryUrl": DANDISET_PAGE,
        "attribution": (
            "Sargolini et al., DANDI 000582 version 0.251111.2151, CC BY 4.0; "
            "transformed by the NeuroStack Explorer offline pipeline."
        ),
        "version": ARTIFACT_VERSION,
        "assetPath": ASSET_PATH,
        "assetUuid": ASSET_UUID,
        "sha256": ASSET_SHA256,
        "license": DATASET_LICENSE,
        "licenseUrl": DATASET_LICENSE_URL,
        "species": SPECIES,
        "brainRegion": BRAIN_REGION,
        "durationSeconds": EXPECTED_DURATION_SECONDS,
        "positionSampleIntervalSeconds": DERIVATIVE_POSITION_INTERVAL_SECONDS,
        "sourcePositionSampleIntervalSeconds": SOURCE_POSITION_INTERVAL_SECONDS,
        "sourcePositionSampleCount": recording.source_position_sample_count,
        "derivativePositionSampleCount": int(timestamps.size),
        "unitIds": [str(unit["id"]) for unit in recording.units],
        "generatedAt": build_timestamp(),
        "sourceAccessDate": ACCESS_DATE,
        "nwbIdentifier": recording.nwb_identifier,
        "nwbVersion": recording.nwb_version,
        "provenanceId": "dandi-000582-v0.251111.2151-asset-2b9e441b",
        "disclosure": (
            "Derived from the pinned public NWB asset under CC BY 4.0. Position "
            "was converted to meters and deterministically decimated; all selected "
            "unit spike times are retained."
        ),
    }
    return _build_artifact(
        metadata=metadata,
        timestamps=timestamps,
        x=x,
        y=y,
        units=recording.units,
        origin="public-derived",
    )


def attach_model_results(
    artifact: dict[str, Any], model_results_path: Path
) -> dict[str, Any]:
    """Attach a fitted model fixture only when its declared inputs still match."""

    results = json.loads(model_results_path.read_text(encoding="utf-8"))
    expected_fingerprint = model_input_fingerprint(artifact)
    if results.get("status") != "computed":
        raise PipelineError("Model-results fixture is not marked computed.")
    if results.get("inputFingerprint") != expected_fingerprint:
        raise PipelineError(
            "Model-results input fingerprint does not match the current derivative."
        )
    required_models = {"nemos", "sklearn", "pytorch", "stan"}
    models = results.get("models")
    if not isinstance(models, dict) or set(models) != required_models:
        raise PipelineError(
            "Model-results fixture must contain NeMoS, scikit-learn, PyTorch, and Stan."
        )
    for name, model in models.items():
        if (
            model.get("status") != "computed"
            or model.get("origin") != "public-derived"
            or model.get("execution") != "precomputed"
            or model.get("artifactAvailable") is not True
            or not model.get("observed")
            or len(model.get("observed", [])) != len(model.get("predicted", []))
            or not math.isfinite(float(model.get("metricValue", math.nan)))
        ):
            raise PipelineError(f"Model-results entry {name!r} is incomplete.")
    artifact["models"] = models
    artifact["modelTask"] = results["task"]
    artifact["modelInputFingerprint"] = expected_fingerprint
    artifact["modelResultsSha256"] = sha256_path(model_results_path)
    return artifact


def build_synthetic_artifact(seed: int = PIPELINE_SEED) -> dict[str, Any]:
    rng = random.Random(seed)
    duration_seconds = 120.0
    sample_interval = 0.1
    sample_count = int(duration_seconds / sample_interval)
    timestamps = np.arange(sample_count, dtype=float) * sample_interval
    x_values: list[float] = []
    y_values: list[float] = []
    angles: list[float] = []
    for index in range(sample_count):
        angle = 2.0 * math.pi * index / 240.0
        angles.append(angle)
        x_values.append(
            0.36 * math.cos(angle)
            + 0.04 * math.sin(3.0 * angle)
            + rng.uniform(-0.008, 0.008)
        )
        y_values.append(
            0.32 * math.sin(angle)
            + 0.03 * math.cos(2.0 * angle)
            + rng.uniform(-0.008, 0.008)
        )

    units: list[dict[str, Any]] = []
    for unit_index, preferred_angle in enumerate(
        (0.0, math.pi / 2.0, math.pi, 3.0 * math.pi / 2.0), start=1
    ):
        spike_times: list[float] = []
        for index, angle in enumerate(angles):
            modulation = max(math.cos(angle - preferred_angle), 0.0) ** 2
            rate_hz = 0.8 + 3.2 * modulation
            if rng.random() < rate_hz * sample_interval:
                spike_times.append(timestamps[index] + rng.random() * sample_interval)
        units.append(
            {
                "id": f"synthetic-unit-{unit_index:02d}",
                "spike_times": np.asarray(sorted(spike_times), dtype=float),
            }
        )

    metadata = {
        "origin": "synthetic",
        "execution": "precomputed",
        "status": "synthetic",
        "datasetId": f"synthetic-neurostack-{seed}",
        "datasetTitle": "NeuroStack deterministic synthetic fallback",
        "authors": ["NeuroStack Explorer deterministic generator"],
        "permanentIdentifier": None,
        "repositoryUrl": None,
        "attribution": "Generated locally from the recorded seed; no biological source.",
        "version": ARTIFACT_VERSION,
        "assetPath": None,
        "assetUuid": None,
        "sha256": None,
        "license": "No external dataset license; generated project fixture",
        "species": "Not applicable—synthetic fixture",
        "brainRegion": "Not applicable—synthetic fixture",
        "durationSeconds": duration_seconds,
        "positionSampleIntervalSeconds": sample_interval,
        "sourcePositionSampleIntervalSeconds": None,
        "sourcePositionSampleCount": sample_count,
        "derivativePositionSampleCount": sample_count,
        "unitIds": [unit["id"] for unit in units],
        "generatedAt": build_timestamp(),
        "sourceAccessDate": None,
        "nwbIdentifier": None,
        "nwbVersion": None,
        "provenanceId": f"synthetic-neurostack-seed-{seed}",
        "seed": seed,
        "disclosure": (
            "Deterministic generated fixture used only when the public derivative "
            "is unavailable or for tests. It is not a biological recording and "
            "must not support scientific-performance claims."
        ),
    }
    return _build_artifact(
        metadata=metadata,
        timestamps=timestamps,
        x=np.asarray(x_values, dtype=float),
        y=np.asarray(y_values, dtype=float),
        units=tuple(units),
        origin="synthetic",
    )


def run_nwb_inspector(source_path: Path) -> dict[str, Any]:
    """Run the DANDI Inspector profile and normalize machine-local output."""

    executable = Path(sys.executable).with_name("nwbinspector")
    if not executable.exists():
        located = shutil.which("nwbinspector")
        if not located:
            return {
                "status": "not-run",
                "version": None,
                "issues": [],
                "note": "nwbinspector executable was unavailable.",
            }
        executable = Path(located)

    with tempfile.TemporaryDirectory(prefix="neurostack-inspector-") as directory:
        report_path = Path(directory) / "report.json"
        command = [
            str(executable),
            str(source_path),
            "--config",
            "dandi",
            "--threshold",
            "BEST_PRACTICE_SUGGESTION",
            "--progress-bar",
            "False",
            "--json-file-path",
            str(report_path),
        ]
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if completed.returncode != 0 or not report_path.exists():
            return {
                "status": "failed",
                "version": _package_version("nwbinspector"),
                "issues": [],
                "note": (
                    "NWB Inspector did not complete. " + completed.stderr.strip()[:500]
                ),
            }
        raw_report = json.loads(report_path.read_text(encoding="utf-8"))
    issues = [
        {
            "importance": message["importance"],
            "severity": message["severity"],
            "check": message["check_function_name"],
            "objectType": message["object_type"],
            "objectName": message["object_name"],
            "location": message.get("location"),
            "message": message["message"],
        }
        for message in raw_report.get("messages", [])
    ]
    issues.sort(key=lambda issue: (issue["importance"], issue["check"]))
    return {
        "status": "completed-with-findings" if issues else "passed",
        "version": raw_report.get("header", {}).get(
            "NWBInspector_version", _package_version("nwbinspector")
        ),
        "config": "dandi",
        "issues": issues,
        "note": (
            "Inspector findings describe the immutable source. The derivative "
            "does not rewrite or silently repair source metadata."
        ),
    }


def _package_version(distribution_name: str) -> str | None:
    try:
        return importlib.metadata.version(distribution_name)
    except importlib.metadata.PackageNotFoundError:
        return None


def _git_commit(repo_root: Path) -> str | None:
    completed = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=repo_root,
        check=False,
        capture_output=True,
        text=True,
    )
    return completed.stdout.strip() if completed.returncode == 0 else None


def _artifact_checks(artifact: dict[str, Any]) -> list[dict[str, Any]]:
    metadata = artifact["metadata"]
    position = artifact["position"]
    units = artifact["units"]
    time_count = len(position["timestamps"])
    checks: list[dict[str, Any]] = []

    def record(name: str, passed: bool, detail: str) -> None:
        checks.append({"name": name, "passed": bool(passed), "detail": detail})

    record(
        "position-array-lengths",
        len(position["x"])
        == len(position["y"])
        == len(position["speed"])
        == time_count,
        f"All position arrays contain {time_count} samples.",
    )
    record(
        "timestamps-monotonic",
        all(
            later > earlier
            for earlier, later in zip(
                position["timestamps"], position["timestamps"][1:], strict=False
            )
        ),
        "Derivative timestamps are strictly increasing.",
    )
    record(
        "unit-identifiers",
        [unit["id"] for unit in units] == metadata["unitIds"],
        f"Artifact contains {len(units)} declared units.",
    )
    record(
        "finite-json-numbers",
        all(
            math.isfinite(float(value))
            for key in ("timestamps", "x", "y", "speed")
            for value in position[key]
        ),
        "All selected position and speed values are finite.",
    )
    if metadata["origin"] == "public-derived" and "modelTask" in artifact:
        record(
            "model-results",
            all(
                model["status"] == "computed"
                and model["artifactAvailable"] is True
                and len(model["observed"]) == len(model["predicted"]) > 0
                and math.isfinite(float(model["metricValue"]))
                for model in artifact["models"].values()
            ),
            "All four aligned public-derived model outputs are computed and finite.",
        )
    else:
        record(
            "model-disclosure",
            all(
                model["status"] == "specification-only"
                and model["artifactAvailable"] is False
                for model in artifact["models"].values()
            ),
            "No unavailable model output is represented as computed.",
        )
    return checks


def _validate_schema_instance(
    payload: dict[str, Any], schema_path: Path, *, label: str
) -> None:
    from jsonschema import (  # type: ignore[import-untyped]
        Draft202012Validator,
        FormatChecker,
    )

    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(payload), key=lambda error: list(error.path))
    if errors:
        details = "; ".join(
            f"{'/'.join(str(part) for part in error.path) or '<root>'}: {error.message}"
            for error in errors
        )
        raise PipelineError(f"{label} failed JSON Schema validation: {details}")


def _build_notebook_manifest(
    *,
    repo_root: Path,
    notebook_path: Path,
    public_notebook_path: Path,
    public_artifact_path: Path,
    synthetic_artifact_path: Path,
    model_results_path: Path,
    source_path: Path,
) -> dict[str, Any]:
    environment_hash = sha256_path(repo_root / "requirements.lock")
    inputs = [
        {
            "reference": "public/artifacts/v1/demo-dataset.json",
            "sha256": sha256_path(public_artifact_path),
        },
        {
            "reference": "public/artifacts/v1/synthetic-dataset.json",
            "sha256": sha256_path(synthetic_artifact_path),
        },
        {
            "reference": (
                "DANDI:000582/0.251111.2151/"
                "sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb"
            ),
            "sha256": sha256_path(source_path),
        },
    ]
    if model_results_path.exists():
        inputs.insert(
            2,
            {
                "reference": "public/artifacts/v1/model-results.json",
                "sha256": sha256_path(model_results_path),
            },
        )
    limitations = [
        (
            "The notebook opens and validates the checksum-gated local NWB source, "
            "reconstructs Pynapple objects, refits the deterministic NeMoS, "
            "scikit-learn, and PyTorch lanes, and verifies their values against the "
            "committed records. It inspects the committed Stan posterior because "
            "resampling Stan would make the notebook unnecessarily slow."
        )
    ]
    if sys.version_info[:2] != (3, 12):
        limitations.append(
            (
                f"It was executed with Python {platform.python_version()} because "
                "the current machine did not expose Python 3.12; release verification "
                "must repeat execution in the declared Python 3.12 environment."
            )
        )
    else:
        limitations.append(
            "The notebook was executed in the declared Python 3.12 runtime lane."
        )
    if not notebook_path.exists():
        return {
            "schemaVersion": ARTIFACT_SCHEMA_VERSION,
            "status": "planned",
            "path": "public/artifacts/v1/neurostack-explorer.ipynb",
            "sha256": None,
            "environmentLockSha256": environment_hash,
            "kernel": None,
            "inputs": inputs,
            "execution": {
                "startedAt": None,
                "completedAt": None,
                "durationSeconds": None,
                "command": "python scripts/execute_notebook.py",
                "cellCount": None,
                "executedCellCount": None,
                "errorCount": None,
                "warnings": ["Notebook has not been generated or executed."],
            },
            "sanitization": {
                "status": "pending",
                "checkedFor": [],
                "notes": "Sanitization requires an executed notebook.",
            },
            "outputs": [],
            "limitations": limitations,
        }

    notebook = json.loads(notebook_path.read_text(encoding="utf-8"))
    code_cells = [cell for cell in notebook["cells"] if cell["cell_type"] == "code"]
    executed_cells = [
        cell for cell in code_cells if cell.get("execution_count") is not None
    ]
    error_count = sum(
        1
        for cell in code_cells
        for output in cell.get("outputs", [])
        if output.get("output_type") == "error"
    )
    notebook_text = notebook_path.read_text(encoding="utf-8")
    forbidden_markers = [str(Path.home()), "AKIA", "ghp_", "sk-"]
    found_markers = [marker for marker in forbidden_markers if marker in notebook_text]
    if found_markers:
        raise PipelineError(
            "Notebook sanitization found machine-local or secret-like markers: "
            + ", ".join(found_markers)
        )
    if error_count or len(executed_cells) != len(code_cells):
        raise PipelineError("Notebook is not fully executed without cell errors.")

    language_version = (
        notebook.get("metadata", {}).get("language_info", {}).get("version", "unknown")
    )
    notebook_hash = sha256_path(notebook_path)
    return {
        "schemaVersion": ARTIFACT_SCHEMA_VERSION,
        "status": "executed",
        "path": "public/artifacts/v1/neurostack-explorer.ipynb",
        "sha256": notebook_hash,
        "environmentLockSha256": environment_hash,
        "kernel": f"Python {language_version} (release target Python 3.12)",
        "inputs": inputs,
        "execution": {
            "startedAt": None,
            "completedAt": None,
            "durationSeconds": None,
            "command": "python scripts/execute_notebook.py",
            "cellCount": len(notebook["cells"]),
            "executedCellCount": len(executed_cells),
            "errorCount": error_count,
            "warnings": [
                (
                    "Wall-clock execution metadata is deliberately stripped after "
                    "success so identical notebook runs produce identical bytes."
                )
            ],
        },
        "sanitization": {
            "status": "passed",
            "checkedFor": [
                "absolute home-directory paths",
                "common cloud access-key prefixes",
                "GitHub token prefixes",
                "OpenAI-style secret-key prefixes",
                "cell execution errors",
            ],
            "notes": (
                "The executed notebook contains repository-relative inputs, bounded "
                "text outputs, deterministic cell IDs, and no detected forbidden markers."
            ),
        },
        "outputs": [
            {
                "path": "public/artifacts/v1/neurostack-explorer.ipynb",
                "mediaType": "application/x-ipynb+json",
                "sha256": sha256_path(public_notebook_path),
                "purpose": "Executable audit trail for the committed artifacts.",
            }
        ],
        "limitations": limitations,
    }


def _build_provenance(
    recording: SourceRecording,
    *,
    repo_root: Path,
    public_artifact_path: Path,
    synthetic_artifact_path: Path,
    model_results_path: Path,
    notebook_path: Path,
    acquisition_method: str,
) -> dict[str, Any]:
    unit_counts = {
        unit["id"]: int(len(unit["spike_times"])) for unit in recording.units
    }
    transformations = [
        (
            "Applied the NWB SpatialSeries conversion (0.01) and offset (0.0) "
            "exactly once to obtain meters."
        ),
        (
            "Selected every fifth 50 Hz position sample, without interpolation, "
            "to form a 10 Hz derivative spanning the full 600 seconds."
        ),
        (
            "Retained every spike time for all eight reviewed unit IDs and "
            "rounded serialized values to six decimal places."
        ),
        (
            "Binned spikes into fixed left-closed/right-open 100 ms bins; the "
            "final bin includes the 600-second right edge by NumPy histogram convention."
        ),
        (
            "Derived speed magnitude from sample-centered finite differences of "
            "10 Hz x/y positions (one-sided at endpoints), with no smoothing; "
            "linearly interpolated speed at each spike time for tuning."
        ),
        (
            "Computed occupancy-aware speed tuning for t1c1, an ISI histogram "
            "for t1c1, and an event-pair lag histogram for t1c1 versus t2c1."
        ),
        (
            "Computed a descriptive unit feature map from mean rate and ISI "
            "coefficient of variation; it is not a learned embedding."
        ),
    ]
    git_commit = _git_commit(repo_root)
    unit_count_note = ", ".join(
        f"{unit_id}={count}" for unit_id, count in unit_counts.items()
    )
    return {
        "schemaVersion": ARTIFACT_SCHEMA_VERSION,
        "status": "verified",
        "dataset": {
            "title": DANDISET_TITLE,
            "authors": list(DATASET_AUTHORS),
            "repository": "DANDI Archive",
            "repositoryUrl": DANDISET_PAGE,
            "persistentIdentifier": f"10.48324/dandi.{DANDISET_ID}/{DANDISET_VERSION}",
            "persistentIdentifierUrl": DANDISET_DOI,
            "species": SPECIES,
            "brainRegions": [BRAIN_REGION],
            "recordingModalities": [RECORDING_MODALITY],
            "behavioralVariables": ["x position", "y position"],
        },
        "license": {
            "status": "verified",
            "name": "Creative Commons Attribution 4.0 International",
            "spdxId": DATASET_LICENSE,
            "url": DATASET_LICENSE_URL,
            "redistributionNotes": (
                "The source and derivative may be shared under CC BY 4.0 with "
                "attribution, a license link, and disclosure of transformations."
            ),
        },
        "access": {
            "accessedAt": f"{ACCESS_DATE}T00:00:00Z",
            "accessMethod": acquisition_method,
            "requiresAuthentication": False,
        },
        "selectedAssets": [
            {
                "assetId": ASSET_UUID,
                "sourceUrl": ASSET_DOWNLOAD_URL,
                "mediaType": "application/x-nwb",
                "byteSize": ASSET_SIZE_BYTES,
                "sha256": ASSET_SHA256,
                "exactSelection": (
                    f"{ASSET_PATH}; {POSITION_SERIES_PATH}; full 0–600 s support; "
                    f"units {', '.join(EXPECTED_UNIT_IDS)}"
                ),
                "nwbVersion": recording.nwb_version,
            }
        ],
        "derivatives": [
            {
                "artifactId": "demo-dataset",
                "path": "public/artifacts/v1/demo-dataset.json",
                "sha256": sha256_path(public_artifact_path),
                "sourceAssetSha256": ASSET_SHA256,
                "generatedBy": "python/neurostack_explorer/artifacts.py",
                "generatedAt": build_timestamp(),
                "transformations": transformations,
                "isSynthetic": False,
            },
            {
                "artifactId": "synthetic-dataset",
                "path": "public/artifacts/v1/synthetic-dataset.json",
                "sha256": sha256_path(synthetic_artifact_path),
                "sourceAssetSha256": None,
                "generatedBy": "python/neurostack_explorer/artifacts.py",
                "generatedAt": build_timestamp(),
                "transformations": [
                    (
                        f"Generated {1200} position samples and four modulated "
                        f"synthetic spike trains with Python random seed {PIPELINE_SEED}."
                    ),
                    "Kept synthetic identifiers and disclosures separate from DANDI metadata.",
                    "Applied the same descriptive derivative calculations as the public artifact.",
                ],
                "isSynthetic": True,
            },
        ]
        + (
            [
                {
                    "artifactId": "model-results",
                    "path": "public/artifacts/v1/model-results.json",
                    "sha256": sha256_path(model_results_path),
                    "sourceAssetSha256": ASSET_SHA256,
                    "generatedBy": "scripts/run_models.py",
                    "generatedAt": build_timestamp(),
                    "transformations": [
                        "Used current-bin x, y, trailing-only speed, and current t1c1 count to predict t1c1 spike count in the next 100 ms bin.",
                        "Fit preprocessing statistics on the chronological training block only.",
                        "Froze a 600-row validation block used only for PyTorch early stopping; the final test remained untouched.",
                        "Reserved a 30-second temporal gap before the final 1,499-row held-out block.",
                        "Actually fit NeMoS, scikit-learn, PyTorch, and CmdStan outputs with pinned software and seed 20260714.",
                    ],
                    "isSynthetic": False,
                }
            ]
            if model_results_path.exists()
            else []
        ),
        "privacyReview": {
            "status": "passed",
            "reviewedAt": f"{ACCESS_DATE}T00:00:00Z",
            "reviewer": "Codex source and privacy audit",
            "notes": (
                "Public rat electrophysiology asset; no human, patient, clinical, "
                "or directly identifying data are selected. Subject demographics "
                "and ambiguous source weight are excluded; the public archive asset "
                "path remains only for chain-of-custody provenance."
            ),
        },
        "notes": [
            f"DANDI dataset API: {DANDISET_API}",
            f"DANDI asset API: {ASSET_API}",
            f"Stable DANDI URI: {ASSET_DANDI_URI}",
            f"Source paper: {SOURCE_PAPER_DOI}",
            (
                f"NWB identifier {recording.nwb_identifier}; source position samples "
                f"{recording.source_position_sample_count}; electrode table rows "
                f"{recording.electrode_count}; available LFP rate "
                f"{recording.lfp_sample_rate_hz:g} Hz."
            ),
            f"Selected unit spike counts: {unit_count_note}.",
            (
                "NWB Inspector flags source subject weight '0.35/0.45' as ambiguous; "
                "the field is excluded from the derivative."
            ),
            (
                "The source session_start_time is 1900-01-01 and is treated as a "
                "placeholder, not an acquisition date."
            ),
            (
                "The Units table does not declare spike-time resolution; timing "
                "precision is not inferred beyond stored values."
            ),
            (
                "Only SpatialSeriesLED1 is selected. Head direction and a second "
                "LED are not claimed in this derivative."
            ),
            (
                "The immutable NWB source remains in a user cache and is neither "
                "committed to Git nor served to site visitors."
            ),
            (
                "NeMoS/JAX, scikit-learn, PyTorch, and CmdStan outputs are "
                "precomputed from one selected unit and one fixed split; they are "
                "demonstrations, not population benchmarks or causal evidence."
                if model_results_path.exists()
                else "Aligned fitted model outputs are pending generation."
            ),
            (
                f"Environment target Python 3.12; verification runtime Python "
                f"{platform.python_version()}; NumPy {_package_version('numpy')}; "
                f"h5py {_package_version('h5py')}; PyNWB {_package_version('pynwb')}; "
                f"NWB Inspector {_package_version('nwbinspector')}."
            ),
            (
                f"Executed model lane: Pynapple {_package_version('pynapple')}; "
                f"NeMoS {_package_version('nemos')}; JAX {_package_version('jax')}; "
                f"scikit-learn {_package_version('scikit-learn')}; PyTorch "
                f"{_package_version('torch')}; CmdStanPy {_package_version('cmdstanpy')} "
                "with externally compiled CmdStan 2.39.0. Separate interface/model "
                f"fixtures use BridgeStan {_package_version('bridgestan')} and "
                f"plenoptic {_package_version('plenoptic')}."
            ),
            (
                "Generator SHA-256 "
                f"{sha256_path(repo_root / 'python' / 'neurostack_explorer' / 'artifacts.py')}; "
                "requirements.lock SHA-256 "
                f"{sha256_path(repo_root / 'requirements.lock')}; pyproject.toml SHA-256 "
                f"{sha256_path(repo_root / 'pyproject.toml')}."
            ),
            (
                f"Notebook {sha256_path(notebook_path)} is executed and recorded "
                "separately in notebook-manifest.json."
                if notebook_path.exists()
                else "Notebook is pending generation."
            ),
            (
                f"Generator Git commit: {git_commit}."
                if git_commit
                else "No Git commit exists yet; regenerate provenance after the reviewed release commit."
            ),
        ],
    }


def build_all(
    repo_root: Path,
    *,
    source_path: Path | None = None,
    cache_dir: Path = DEFAULT_CACHE_DIR,
    allow_download: bool = False,
    inspect_source: bool = False,
) -> dict[str, Path]:
    """Build all source-backed and synthetic artifacts and their evidence records."""

    cache_was_present = (cache_dir / ASSET_NAME).exists()
    resolved_source = source_path or fetch_verified_source(
        cache_dir, allow_download=allow_download
    )
    if source_path is not None:
        acquisition_method = (
            "Existing local file supplied with --source; expected byte size and "
            "SHA-256 were verified before reading."
        )
    elif cache_was_present:
        acquisition_method = (
            "Existing pinned asset in the NeuroStack user cache; expected byte "
            "size and SHA-256 were re-verified before reading."
        )
    else:
        acquisition_method = (
            "Unauthenticated HTTPS download from the immutable published DANDI "
            "asset endpoint; cached locally after byte-size and SHA-256 verification."
        )
    artifact_dir = repo_root / "public" / "artifacts" / "v1"
    recording = extract_source_recording(resolved_source)
    public_artifact = build_public_artifact(recording)
    model_results_path = artifact_dir / "model-results.json"
    if model_results_path.exists():
        public_artifact = attach_model_results(public_artifact, model_results_path)
    synthetic_artifact = build_synthetic_artifact()

    public_path = artifact_dir / "demo-dataset.json"
    synthetic_path = artifact_dir / "synthetic-dataset.json"
    write_json(public_path, public_artifact, compact=True)
    write_json(synthetic_path, synthetic_artifact, compact=True)

    public_checks = _artifact_checks(public_artifact)
    synthetic_checks = _artifact_checks(synthetic_artifact)
    if not all(check["passed"] for check in public_checks + synthetic_checks):
        raise PipelineError("Generated artifact validation failed.")
    if public_path.stat().st_size > 2 * 1024 * 1024:
        raise PipelineError(
            "Public derivative exceeds the 2 MiB compact-artifact target."
        )

    provenance_path = repo_root / "data" / "provenance.json"
    notebook_path = repo_root / "notebooks" / "neurostack_explorer.ipynb"
    public_notebook_path = artifact_dir / "neurostack-explorer.ipynb"
    if notebook_path.exists():
        shutil.copyfile(notebook_path, public_notebook_path)
    notebook_manifest_path = artifact_dir / "notebook-manifest.json"
    notebook_manifest = _build_notebook_manifest(
        repo_root=repo_root,
        notebook_path=notebook_path,
        public_notebook_path=public_notebook_path,
        public_artifact_path=public_path,
        synthetic_artifact_path=synthetic_path,
        model_results_path=model_results_path,
        source_path=resolved_source,
    )
    _validate_schema_instance(
        notebook_manifest,
        repo_root / "schemas" / "notebook-manifest.schema.json",
        label="Notebook manifest",
    )
    write_json(notebook_manifest_path, notebook_manifest, compact=False)

    provenance = _build_provenance(
        recording,
        repo_root=repo_root,
        public_artifact_path=public_path,
        synthetic_artifact_path=synthetic_path,
        model_results_path=model_results_path,
        notebook_path=notebook_path,
        acquisition_method=acquisition_method,
    )
    _validate_schema_instance(
        provenance,
        repo_root / "schemas" / "dataset-provenance.schema.json",
        label="Dataset provenance",
    )
    write_json(provenance_path, provenance, compact=False)
    public_provenance_path = artifact_dir / "provenance.json"
    write_json(public_provenance_path, provenance, compact=False)

    inspector = (
        run_nwb_inspector(resolved_source)
        if inspect_source
        else {
            "status": "not-run",
            "version": _package_version("nwbinspector"),
            "issues": [],
            "note": "Run with --inspect for the DANDI-profile findings.",
        }
    )
    blocking_issues: list[str] = []
    if sys.version_info[:2] != (3, 12):
        blocking_issues.append(
            f"Artifacts were generated with Python {platform.python_version()}; "
            "release regeneration and notebook execution require Python 3.12."
        )
    if inspector["status"] == "not-run":
        blocking_issues.append(
            "NWB Inspector did not run; rebuild with --inspect before release."
        )
    elif inspector["status"] == "failed":
        blocking_issues.append(
            "NWB Inspector failed: " + str(inspector.get("note", "unknown error"))
        )
    bridge_path = artifact_dir / "bridgestan-surface.json"
    plenoptic_path = artifact_dir / "plenoptic-demo.json"
    if "modelTask" not in public_artifact or not model_results_path.exists():
        blocking_issues.append(
            "Aligned NeMoS, scikit-learn, PyTorch, and Stan model outputs are missing."
        )
    if not bridge_path.exists():
        blocking_issues.append("The executed BridgeStan surface fixture is missing.")
    if not plenoptic_path.exists():
        blocking_issues.append("The executed plenoptic synthesis fixture is missing.")

    if blocking_issues:
        overall_assessment = "needs-revision"
    elif inspector["status"] == "completed-with-findings":
        overall_assessment = "share-with-caveats"
    elif inspector["status"] == "passed":
        overall_assessment = "ready-to-share"
    else:
        overall_assessment = "needs-revision"

    validation_report = {
        "schemaVersion": ARTIFACT_SCHEMA_VERSION,
        "generatedAt": build_timestamp(),
        "overallAssessment": overall_assessment,
        "source": {
            "assetUuid": ASSET_UUID,
            "expectedSizeBytes": ASSET_SIZE_BYTES,
            "actualSizeBytes": resolved_source.stat().st_size,
            "expectedSha256": ASSET_SHA256,
            "actualSha256": sha256_path(resolved_source),
            "pynwbSchemaValidation": {
                "status": "passed",
                "version": _package_version("pynwb"),
                "errors": list(recording.schema_validation_errors),
            },
            "nwbInspector": inspector,
        },
        "publicDerivative": {
            "path": "public/artifacts/v1/demo-dataset.json",
            "sha256": sha256_path(public_path),
            "sizeBytes": public_path.stat().st_size,
            "checks": public_checks,
            "status": "passed",
        },
        "syntheticFallback": {
            "path": "public/artifacts/v1/synthetic-dataset.json",
            "sha256": sha256_path(synthetic_path),
            "sizeBytes": synthetic_path.stat().st_size,
            "seed": PIPELINE_SEED,
            "checks": synthetic_checks,
            "status": "passed",
        },
        "models": {
            "status": "passed" if "modelTask" in public_artifact else "missing",
            "path": "public/artifacts/v1/model-results.json",
            "sha256": sha256_path(model_results_path)
            if model_results_path.exists()
            else None,
            "inputFingerprint": public_artifact.get("modelInputFingerprint"),
            "available": sorted(public_artifact["models"])
            if "modelTask" in public_artifact
            else [],
            "taskVersion": public_artifact.get("modelTask", {}).get("version"),
            "split": public_artifact.get("modelTask", {}).get("split"),
            "finalTestMeanPoissonDeviance": {
                name: model["metricValue"]
                for name, model in public_artifact["models"].items()
            }
            if "modelTask" in public_artifact
            else {},
        },
        "interfaceDemos": {
            "bridgeStan": {
                "status": "computed" if bridge_path.exists() else "missing",
                "path": "public/artifacts/v1/bridgestan-surface.json",
                "sha256": sha256_path(bridge_path) if bridge_path.exists() else None,
            },
            "plenoptic": {
                "status": "computed" if plenoptic_path.exists() else "missing",
                "path": "public/artifacts/v1/plenoptic-demo.json",
                "sha256": sha256_path(plenoptic_path)
                if plenoptic_path.exists()
                else None,
            },
        },
        "notebook": {
            "path": "public/artifacts/v1/neurostack-explorer.ipynb",
            "sourcePath": "notebooks/neurostack_explorer.ipynb",
            "status": "executed" if notebook_path.exists() else "pending-generation",
            "sha256": sha256_path(notebook_path) if notebook_path.exists() else None,
            "sizeBytes": notebook_path.stat().st_size
            if notebook_path.exists()
            else None,
            "executionCommand": "python scripts/execute_notebook.py",
            "manifestPath": "public/artifacts/v1/notebook-manifest.json",
            "manifestSha256": sha256_path(notebook_manifest_path),
            "sanitizationStatus": notebook_manifest["sanitization"]["status"],
        },
        "blockingIssues": blocking_issues,
        "requiredCaveats": [
            "The session_start_time is a 1900 placeholder and is not an acquisition date.",
            "Source subject weight is ambiguous and excluded.",
            "Spike-time resolution is not declared in the source Units table.",
            "Only LED1 x/y position is used; head direction is not derived.",
            "Fitted-model scores describe one selected unit, one split, and one recording; they are not benchmark rankings or causal evidence.",
            "BridgeStan and plenoptic are separate illustrative interface/model demonstrations, not a continuation of the electrophysiology analysis.",
        ],
    }
    validation_path = repo_root / "data" / "validation-report.json"
    write_json(validation_path, validation_report, compact=False)
    public_validation_path = artifact_dir / "validation-report.json"
    write_json(public_validation_path, validation_report, compact=False)

    manifest = {
        "schemaVersion": ARTIFACT_SCHEMA_VERSION,
        "generatedAt": build_timestamp(),
        "defaultArtifact": "demo-dataset",
        "fallbackArtifact": "synthetic-dataset",
        "provenancePath": "./provenance.json",
        "validationPath": "./validation-report.json",
        "artifacts": [
            {
                "id": "demo-dataset",
                "path": "./demo-dataset.json",
                "mediaType": "application/json",
                "origin": "public-derived",
                "execution": "precomputed",
                "sha256": sha256_path(public_path),
                "sizeBytes": public_path.stat().st_size,
                "license": DATASET_LICENSE,
                "disclosure": "Transformed derivative of the pinned public NWB asset.",
            },
            {
                "id": "synthetic-dataset",
                "path": "./synthetic-dataset.json",
                "mediaType": "application/json",
                "origin": "synthetic",
                "execution": "precomputed",
                "sha256": sha256_path(synthetic_path),
                "sizeBytes": synthetic_path.stat().st_size,
                "seed": PIPELINE_SEED,
                "license": "No external dataset license",
                "disclosure": "Deterministic generated fallback; not biological data.",
            },
        ]
        + (
            [
                {
                    "id": "model-results",
                    "path": "./model-results.json",
                    "mediaType": "application/json",
                    "origin": "public-derived",
                    "execution": "precomputed",
                    "sha256": sha256_path(model_results_path),
                    "sizeBytes": model_results_path.stat().st_size,
                    "license": "Project-generated derivative metadata",
                    "disclosure": "Executed aligned-model outputs for one selected unit and fixed split.",
                }
            ]
            if model_results_path.exists()
            else []
        )
        + (
            [
                {
                    "id": "bridgestan-surface",
                    "path": "./bridgestan-surface.json",
                    "mediaType": "application/json",
                    "origin": "illustrative",
                    "execution": "precomputed",
                    "sha256": sha256_path(bridge_path),
                    "sizeBytes": bridge_path.stat().st_size,
                    "license": "Project-generated fixture",
                    "disclosure": "Compiled BridgeStan log-density and gradient interface demonstration.",
                },
                {
                    "id": "plenoptic-demo",
                    "path": "./plenoptic-demo.json",
                    "mediaType": "application/json",
                    "origin": "illustrative",
                    "execution": "precomputed",
                    "sha256": sha256_path(plenoptic_path),
                    "sizeBytes": plenoptic_path.stat().st_size,
                    "license": "Project-generated procedural fixture",
                    "disclosure": "Executed plenoptic synthesis on a separate procedural image.",
                },
            ]
            if bridge_path.exists() and plenoptic_path.exists()
            else []
        ),
        "modelArtifacts": {
            "status": "computed" if "modelTask" in public_artifact else "missing",
            "available": sorted(public_artifact["models"])
            if "modelTask" in public_artifact
            else [],
            "disclosure": (
                "All displayed scores use one common held-out count task; they are "
                "demonstration outputs, not benchmark or causal claims."
            ),
        },
        "relatedArtifacts": [
            {
                "id": "neurostack-explorer-notebook",
                "path": "./neurostack-explorer.ipynb",
                "status": "executed"
                if notebook_path.exists()
                else "pending-generation",
                "sha256": sha256_path(notebook_path)
                if notebook_path.exists()
                else None,
                "disclosure": (
                    "Executed, read-only walkthrough that validates the local NWB "
                    "source, reconstructs Pynapple objects, refits the deterministic "
                    "NeMoS, scikit-learn, and PyTorch lanes, and inspects the "
                    "committed Stan posterior."
                ),
            },
            {
                "id": "neurostack-explorer-notebook-manifest",
                "path": "./notebook-manifest.json",
                "status": notebook_manifest["status"],
                "sha256": sha256_path(notebook_manifest_path),
                "disclosure": (
                    "Schema-validated execution, input, sanitization, and output "
                    "record for the notebook."
                ),
            },
            {
                "id": "dataset-provenance",
                "path": "./provenance.json",
                "status": provenance["status"],
                "sha256": sha256_path(public_provenance_path),
                "disclosure": "Public, schema-validated dataset attribution and chain of custody.",
            },
            {
                "id": "validation-report",
                "path": "./validation-report.json",
                "status": validation_report["overallAssessment"],
                "sha256": sha256_path(public_validation_path),
                "disclosure": "Public validation outcomes, blockers, and source caveats.",
            },
        ],
    }
    manifest_path = artifact_dir / "manifest.json"
    write_json(manifest_path, manifest, compact=True)

    return {
        "source": resolved_source,
        "public": public_path,
        "synthetic": synthetic_path,
        "notebookManifest": notebook_manifest_path,
        "publicNotebook": public_notebook_path,
        "provenance": provenance_path,
        "publicProvenance": public_provenance_path,
        "validation": validation_path,
        "publicValidation": public_validation_path,
        "manifest": manifest_path,
    }
