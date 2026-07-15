#!/usr/bin/env python3
"""Compile and evaluate a real two-parameter BridgeStan model surface."""

from __future__ import annotations

import hashlib
import importlib.metadata
import shutil
import sys
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "python"))

from neurostack_explorer.artifacts import write_json  # noqa: E402
from neurostack_explorer.constants import (  # noqa: E402
    ARTIFACT_SCHEMA_VERSION,
    DEFAULT_CACHE_DIR,
    PIPELINE_SEED,
)


def rounded(values: np.ndarray, digits: int = 7) -> list[float]:
    return [float(value) for value in np.round(values, digits).tolist()]


def main() -> int:
    import bridgestan

    source = REPO_ROOT / "python" / "stan" / "bridge_surface.stan"
    cache_dir = DEFAULT_CACHE_DIR.parents[2] / "models" / "v1" / "bridgestan"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cached_source = cache_dir / source.name
    if not cached_source.exists() or cached_source.read_bytes() != source.read_bytes():
        shutil.copyfile(source, cached_source)

    model_library = bridgestan.compile_model(cached_source)
    model = bridgestan.StanModel(model_library, data={}, seed=PIPELINE_SEED)
    axis = np.linspace(-2.0, 2.0, 17)
    log_density: list[list[float]] = []
    gradient_x: list[list[float]] = []
    gradient_y: list[list[float]] = []
    for first in axis:
        density_row: list[float] = []
        gradient_x_row: list[float] = []
        gradient_y_row: list[float] = []
        for second in axis:
            density, gradient = model.log_density_gradient(
                np.asarray([first, second], dtype=np.float64),
                propto=False,
                jacobian=True,
            )
            density_row.append(round(float(density), 7))
            gradient_x_row.append(round(float(gradient[0]), 7))
            gradient_y_row.append(round(float(gradient[1]), 7))
        log_density.append(density_row)
        gradient_x.append(gradient_x_row)
        gradient_y.append(gradient_y_row)

    theta = np.asarray([1.5, -1.25], dtype=np.float64)
    step_size = 0.15
    trace: list[dict[str, object]] = []
    for step in range(9):
        density, gradient = model.log_density_gradient(
            theta, propto=False, jacobian=True
        )
        trace.append(
            {
                "step": step,
                "theta": rounded(theta),
                "logDensity": round(float(density), 7),
                "gradient": rounded(np.asarray(gradient)),
            }
        )
        theta = theta + step_size * np.asarray(gradient)

    probe = np.asarray([0.4, -0.7], dtype=np.float64)
    _, analytic_gradient = model.log_density_gradient(
        probe, propto=False, jacobian=True
    )
    epsilon = 1e-6
    finite_difference = np.empty(2, dtype=float)
    for index in range(2):
        offset = np.zeros(2, dtype=float)
        offset[index] = epsilon
        plus = model.log_density(probe + offset, propto=False, jacobian=True)
        minus = model.log_density(probe - offset, propto=False, jacobian=True)
        finite_difference[index] = (plus - minus) / (2 * epsilon)
    max_gradient_error = float(
        np.max(np.abs(np.asarray(analytic_gradient) - finite_difference))
    )
    if max_gradient_error > 1e-6:
        raise RuntimeError(
            f"BridgeStan gradient check failed: error {max_gradient_error:.3g}."
        )

    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    payload = {
        "schemaVersion": ARTIFACT_SCHEMA_VERSION,
        "status": "computed",
        "origin": "illustrative",
        "execution": "precomputed",
        "seed": PIPELINE_SEED,
        "software": {
            "bridgestan": importlib.metadata.version("bridgestan"),
        },
        "model": {
            "sourcePath": "python/stan/bridge_surface.stan",
            "sourceSha256": source_hash,
            "parameters": list(model.param_names()),
            "unconstrainedParameterCount": model.param_unc_num(),
            "target": (
                "Independent standard-normal priors plus 0.35 times the parameter "
                "product; an interface demonstration, not a biological model."
            ),
            "propto": False,
            "jacobian": True,
        },
        "surface": {
            "axis": rounded(axis),
            "logDensity": log_density,
            "gradientX": gradient_x,
            "gradientY": gradient_y,
        },
        "optimizerTrace": {
            "method": "nine deterministic gradient-ascent evaluations",
            "stepSize": step_size,
            "steps": trace,
        },
        "gradientCheck": {
            "theta": rounded(probe),
            "epsilon": epsilon,
            "analytic": rounded(np.asarray(analytic_gradient)),
            "finiteDifference": rounded(finite_difference),
            "maxAbsoluteError": round(max_gradient_error, 10),
            "status": "passed",
        },
        "disclosure": (
            "This fixture was evaluated by the pinned BridgeStan Python interface "
            "against a compiled Stan model. It is separate from the DANDI recording "
            "and demonstrates unconstrained log density and gradients only."
        ),
    }
    output = REPO_ROOT / "public" / "artifacts" / "v1" / "bridgestan-surface.json"
    write_json(output, payload, compact=True)
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
