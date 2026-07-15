#!/usr/bin/env python3
"""Fit the aligned NeMoS, scikit-learn, PyTorch, and Stan fixtures."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "python"))

from neurostack_explorer.constants import DEFAULT_CACHE_DIR  # noqa: E402
from neurostack_explorer.modeling import (  # noqa: E402
    load_artifact,
    run_aligned_models,
    write_model_results,
)


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(
        description="Fit deterministic aligned model outputs from the public derivative."
    )
    command.add_argument(
        "--install-cmdstan",
        action="store_true",
        help="Install pinned CmdStan 2.39.0 when it is not already available.",
    )
    return command


def main(argv: list[str] | None = None) -> int:
    arguments = parser().parse_args(argv)
    import cmdstanpy

    try:
        cmdstanpy.cmdstan_path()
    except ValueError:
        if not arguments.install_cmdstan:
            raise RuntimeError(
                "CmdStan is missing. Re-run with --install-cmdstan to install 2.39.0."
            ) from None
        cmdstanpy.install_cmdstan(version="2.39.0", cores=2, progress=True)

    artifact_path = REPO_ROOT / "public" / "artifacts" / "v1" / "demo-dataset.json"
    artifact = load_artifact(artifact_path)
    model_cache = DEFAULT_CACHE_DIR.parents[2] / "models" / "v1"
    payload = run_aligned_models(
        artifact,
        repo_root=REPO_ROOT,
        output_dir=model_cache / "cmdstan",
    )
    output_path = artifact_path.with_name("model-results.json")
    write_model_results(output_path, payload)
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
