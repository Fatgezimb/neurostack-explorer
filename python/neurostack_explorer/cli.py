"""Command-line entry point for the offline artifact builder."""

from __future__ import annotations

import argparse
from pathlib import Path

from .artifacts import PipelineError, build_all
from .constants import DEFAULT_CACHE_DIR


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(
        description=(
            "Fetch the exact pinned DANDI asset, verify it, and generate compact "
            "public-derived plus synthetic web artifacts."
        )
    )
    command.add_argument(
        "--repo-root",
        type=Path,
        default=Path.cwd(),
        help="Repository root (default: current directory).",
    )
    command.add_argument(
        "--source",
        type=Path,
        help="Use an existing NWB file; its size and SHA-256 are still verified.",
    )
    command.add_argument(
        "--cache-dir",
        type=Path,
        default=DEFAULT_CACHE_DIR,
        help=f"Source cache directory (default: {DEFAULT_CACHE_DIR}).",
    )
    command.add_argument(
        "--download",
        action="store_true",
        help="Download the immutable 15.7 MB asset when absent from the cache.",
    )
    command.add_argument(
        "--inspect",
        action="store_true",
        help="Run NWB Inspector with its DANDI profile and record normalized findings.",
    )
    return command


def main(argv: list[str] | None = None) -> int:
    arguments = parser().parse_args(argv)
    try:
        paths = build_all(
            arguments.repo_root.resolve(),
            source_path=arguments.source.resolve() if arguments.source else None,
            cache_dir=arguments.cache_dir.expanduser().resolve(),
            allow_download=arguments.download,
            inspect_source=arguments.inspect,
        )
    except PipelineError as error:
        parser().error(str(error))
    for label, path in paths.items():
        print(f"{label}: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
