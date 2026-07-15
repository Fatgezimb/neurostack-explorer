"""Pinned source identity and release constants.

The DANDI identifiers in this module are immutable release inputs. Changing any
of them is a source-review event, not a routine pipeline configuration change.
"""

from __future__ import annotations

from pathlib import Path

ARTIFACT_SCHEMA_VERSION = "1.0.0"
ARTIFACT_VERSION = "1.0.0"
PIPELINE_SEED = 20_260_714
ACCESS_DATE = "2026-07-14"

# A normalized release timestamp keeps byte-for-byte artifact builds stable.
# The access date remains separately recorded in provenance.
DEFAULT_BUILD_TIMESTAMP = "2026-07-14T00:00:00Z"

DANDISET_ID = "000582"
DANDISET_VERSION = "0.251111.2151"
DANDISET_TITLE = (
    "Conjunctive Representation of Position, Direction, and Velocity in "
    "Entorhinal Cortex"
)
DANDISET_DOI = "https://doi.org/10.48324/dandi.000582/0.251111.2151"
DANDISET_PAGE = "https://dandiarchive.org/dandiset/000582/0.251111.2151"
DANDISET_API = (
    "https://api.dandiarchive.org/api/dandisets/000582/versions/0.251111.2151/"
)
SOURCE_PAPER_DOI = "https://doi.org/10.1126/science.1125572"
DATASET_LICENSE = "CC-BY-4.0"
DATASET_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/"
DATASET_AUTHORS = (
    "Francesca Sargolini",
    "Marianne Fyhn",
    "Torkel Hafting",
    "Bruce L. McNaughton",
    "Menno P. Witter",
    "May-Britt Moser",
    "Edvard I. Moser",
    "Haagen Waade",
    "Simon Ball",
)

ASSET_UUID = "2b9e441b-56bc-4be2-893e-0e02d22d239d"
ASSET_PATH = "sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb"
ASSET_NAME = "sub-10073_ses-17010302_behavior+ecephys.nwb"
ASSET_SIZE_BYTES = 15_657_857
ASSET_SHA256 = "43b3b435b953d22e276acc494af2926b63deaf15d2834531b2a87d08a8458a09"
ASSET_API = f"https://api.dandiarchive.org/api/assets/{ASSET_UUID}/"
ASSET_DOWNLOAD_URL = f"{ASSET_API}download/"
ASSET_DANDI_URI = f"dandi://dandi/{DANDISET_ID}@{DANDISET_VERSION}/{ASSET_PATH}"

SPECIES = "Rattus norvegicus (Long Evans rat)"
BRAIN_REGION = "Medial entorhinal cortex, layer II (MEC LII)"
RECORDING_MODALITY = (
    "Extracellular electrophysiology with sorted spike times, LFP, and "
    "two-dimensional LED position"
)

POSITION_SERIES_PATH = "/processing/behavior/Position/SpatialSeriesLED1"
SOURCE_POSITION_INTERVAL_SECONDS = 0.02
POSITION_DECIMATION_FACTOR = 5
DERIVATIVE_POSITION_INTERVAL_SECONDS = 0.1
SPIKE_BIN_SECONDS = 0.1
EXPECTED_POSITION_SAMPLES = 30_000
EXPECTED_DERIVATIVE_POSITION_SAMPLES = 6_000
EXPECTED_DURATION_SECONDS = 600.0
EXPECTED_UNIT_IDS = (
    "t1c1",
    "t2c1",
    "t2c3",
    "t3c1",
    "t3c2",
    "t3c3",
    "t3c4",
    "t4c1",
)

DEFAULT_CACHE_DIR = (
    Path.home()
    / ".cache"
    / "neurostack-explorer"
    / "dandi"
    / DANDISET_ID
    / DANDISET_VERSION
)
