#!/usr/bin/env python3
"""Generate a deterministic plenoptic metamer fixture from a procedural image."""

from __future__ import annotations

import hashlib
import importlib.metadata
import sys
from pathlib import Path
from typing import Any

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "python"))

from neurostack_explorer.artifacts import write_json  # noqa: E402
from neurostack_explorer.constants import (  # noqa: E402
    ARTIFACT_SCHEMA_VERSION,
    PIPELINE_SEED,
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rounded_image(values: np.ndarray) -> list[list[float]]:
    return [
        [float(value) for value in row]
        for row in np.round(np.asarray(values, dtype=float), 5).tolist()
    ]


def main() -> int:
    import plenoptic as po  # type: ignore[import-untyped]
    import torch
    from PIL import Image

    torch.use_deterministic_algorithms(True)
    torch.manual_seed(PIPELINE_SEED)
    torch.set_num_threads(1)
    po.set_seed(PIPELINE_SEED)
    coordinate = torch.linspace(-1.0, 1.0, 24, dtype=torch.float64)
    y_coordinate, x_coordinate = torch.meshgrid(coordinate, coordinate, indexing="ij")
    source = (
        0.5
        + 0.24 * torch.sin(7.0 * x_coordinate) * torch.cos(5.0 * y_coordinate)
        + 0.2
        * torch.exp(-((x_coordinate - 0.25) ** 2 + (y_coordinate + 0.2) ** 2) / 0.08)
    ).clamp(0.0, 1.0)[None, None]
    model = po.models.Gaussian(kernel_size=9, std=2.0).to(dtype=torch.float64)
    model.eval()
    po.remove_grad(model)
    metamer = po.Metamer(source, model)
    initial_image = torch.linspace(0.05, 0.95, 24 * 24, dtype=torch.float64).reshape(
        1, 1, 24, 24
    )
    metamer.setup(
        initial_image=initial_image,
        optimizer=torch.optim.Adam,
        optimizer_kwargs={"lr": 0.02, "amsgrad": True},
    )
    metamer.synthesize(
        max_iter=80,
        store_progress=10,
        stop_criterion=1e-8,
        stop_iters_to_check=20,
    )
    synthesis = metamer.metamer.detach().cpu().numpy()[0, 0]
    source_array = source.detach().cpu().numpy()[0, 0]
    difference = synthesis - source_array
    with torch.no_grad():
        source_representation = model(source)
        synthesis_representation = model(metamer.metamer)
        representation_difference = (
            (synthesis_representation - source_representation)
            .detach()
            .cpu()
            .numpy()[0, 0]
        )
        representation_mse = torch.mean(
            (synthesis_representation - source_representation) ** 2
        ).item()
    pixel_mse = float(np.mean(difference**2))
    losses = np.asarray([float(loss) for loss in metamer.losses], dtype=float)
    checkpoints: list[dict[str, Any]] = [
        {"iteration": int(index), "loss": round(float(losses[index]), 10)}
        for index in range(0, len(losses), 10)
    ]
    if checkpoints[-1]["iteration"] != len(losses) - 1:
        checkpoints.append(
            {
                "iteration": len(losses) - 1,
                "loss": round(float(losses[-1]), 10),
            }
        )
    if not losses[-1] < losses[0]:
        raise RuntimeError("plenoptic synthesis did not reduce the model loss.")

    artifact_dir = REPO_ROOT / "public" / "artifacts" / "v1"
    artifact_dir.mkdir(parents=True, exist_ok=True)

    def save_grayscale(
        path: Path, array: np.ndarray, *, difference_map: bool = False
    ) -> None:
        if difference_map:
            scale = max(float(np.max(np.abs(array))), 1e-12)
            normalized = 0.5 + 0.5 * array / scale
        else:
            normalized = np.clip(array, 0.0, 1.0)
        pixels = np.round(normalized * 255).astype(np.uint8)
        Image.fromarray(pixels, mode="L").resize(
            (240, 240), Image.Resampling.NEAREST
        ).save(
            path,
            format="PNG",
            optimize=False,
            compress_level=9,
        )

    source_path = artifact_dir / "plenoptic-source.png"
    synthesis_path = artifact_dir / "plenoptic-synthesis.png"
    difference_path = artifact_dir / "plenoptic-difference.png"
    representation_difference_path = (
        artifact_dir / "plenoptic-representation-difference.png"
    )
    save_grayscale(source_path, source_array)
    save_grayscale(synthesis_path, synthesis)
    save_grayscale(difference_path, difference, difference_map=True)
    save_grayscale(
        representation_difference_path,
        representation_difference,
        difference_map=True,
    )

    saved_metamers = metamer.saved_metamer.detach().cpu().numpy()[:, 0, 0]
    if len(saved_metamers) != len(checkpoints):
        raise RuntimeError(
            "plenoptic saved-progress frames do not align with recorded checkpoints."
        )
    for checkpoint, checkpoint_image in zip(checkpoints, saved_metamers):
        checkpoint_path = artifact_dir / (
            f"plenoptic-checkpoint-{checkpoint['iteration']:03d}.png"
        )
        save_grayscale(checkpoint_path, checkpoint_image)
        checkpoint["png"] = {
            "path": f"./{checkpoint_path.name}",
            "sha256": sha256(checkpoint_path),
        }

    payload = {
        "schemaVersion": ARTIFACT_SCHEMA_VERSION,
        "status": "computed",
        "origin": "illustrative",
        "execution": "precomputed",
        "seed": PIPELINE_SEED,
        "software": {
            "plenoptic": importlib.metadata.version("plenoptic"),
            "torch": importlib.metadata.version("torch"),
        },
        "input": {
            "kind": "procedural nonmedical grayscale image",
            "shape": [1, 1, 24, 24],
            "range": [0.0, 1.0],
            "reuseStatus": (
                "Generated by this repository's deterministic script; no external "
                "image or human-subject stimulus is used."
            ),
            "pixels": rounded_image(source_array),
            "png": {
                "path": "./plenoptic-source.png",
                "sha256": sha256(source_path),
            },
        },
        "model": {
            "name": "plenoptic.models.Gaussian",
            "configuration": {
                "kernelSize": 9,
                "standardDeviation": 2.0,
                "dtype": "float64",
                "evaluationMode": True,
                "parametersFrozen": True,
            },
        },
        "synthesis": {
            "method": "plenoptic.Metamer",
            "maxIterations": 80,
            "completedIterations": len(losses) - 1,
            "optimizer": "torch.optim.Adam(lr=0.02, amsgrad=True)",
            "initialImage": "fixed 0.05-to-0.95 row-major ramp",
            "checkpoints": checkpoints,
            "initialLoss": round(float(losses[0]), 10),
            "finalLoss": round(float(losses[-1]), 10),
            "pixelMse": round(pixel_mse, 10),
            "representationMse": round(float(representation_mse), 10),
            "pixels": rounded_image(synthesis),
            "png": {
                "path": "./plenoptic-synthesis.png",
                "sha256": sha256(synthesis_path),
            },
            "differencePng": {
                "path": "./plenoptic-difference.png",
                "sha256": sha256(difference_path),
                "displayScaling": (
                    "Signed difference is mapped symmetrically around mid-gray; "
                    "the PNG is for visualization, not numeric recovery."
                ),
            },
            "representationDifferencePng": {
                "path": "./plenoptic-representation-difference.png",
                "sha256": sha256(representation_difference_path),
                "displayScaling": (
                    "Signed Gaussian-model response difference is mapped "
                    "symmetrically around mid-gray; the PNG is a display aid."
                ),
            },
        },
        "disclosure": (
            "This is a real deterministic plenoptic synthesis using a fixed Gaussian "
            "visual model and a separate procedural image. Similarity in this model "
            "representation is not evidence of human perceptual equivalence and is "
            "not derived from the DANDI electrophysiology recording."
        ),
    }
    output = artifact_dir / "plenoptic-demo.json"
    write_json(output, payload, compact=True)
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
