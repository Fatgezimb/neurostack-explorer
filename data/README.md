# Data directory contract

NeuroStack Explorer uses one verified, immutable public NWB asset and keeps the
15.7 MB source file outside Git. This directory contains the tracked provenance
and validation records; compact browser artifacts live under
[`../public/artifacts/v1`](../public/artifacts/v1).

## Verified public source

| Field | Reviewed value |
| --- | --- |
| Dandiset | `000582`, version `0.251111.2151` |
| Title | Conjunctive Representation of Position, Direction, and Velocity in Entorhinal Cortex |
| DOI | `10.48324/dandi.000582/0.251111.2151` |
| License | CC BY 4.0 |
| Asset | `sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb` |
| Asset UUID | `2b9e441b-56bc-4be2-893e-0e02d22d239d` |
| Source bytes | `15,657,857` |
| Source SHA-256 | `43b3b435b953d22e276acc494af2926b63deaf15d2834531b2a87d08a8458a09` |
| Selected recording | One 600-second Long Evans rat MEC layer II session, eight sorted units, LED1 x/y position |

The source `session_start_time` is a 1900 placeholder and is not treated as an
acquisition date. The archive label `17010302` is retained as a label only. See
[`../DATA_PROVENANCE.md`](../DATA_PROVENANCE.md) and
[`provenance.json`](provenance.json) for authorship, access date, transformations,
exclusions, identifiers, and caveats.

## Storage boundary

The verified NWB file is cached outside the repository at:

```text
~/.cache/neurostack-explorer/dandi/000582/0.251111.2151/
```

Tracked data files are intentionally small:

```text
data/
  README.md
  provenance.json
  validation-report.json

public/artifacts/v1/
  demo-dataset.json
  synthetic-dataset.json
  model-results.json
  bridgestan-surface.json
  plenoptic-demo.json
  plenoptic-*.png
  neurostack-explorer.ipynb
  notebook-manifest.json
  provenance.json
  validation-report.json
  manifest.json
```

Do not commit source NWB/HDF5 files, private or identifying data, signed URLs,
credentials, local absolute paths, or undocumented binaries. Git LFS is not
configured because the reviewed web bundle does not require it.

## Reproducible workflow

The fetch step is deliberately gated even though provenance is verified:

```bash
NEUROSTACK_DATASET_STATUS=verified \
NEUROSTACK_ALLOW_PUBLIC_DATA_FETCH=true \
.venv/bin/python scripts/fetch_public_dataset.py
```

With the verified source present in the external cache, regenerate and validate:

```bash
.venv/bin/python scripts/build_demo_dataset.py
.venv/bin/python scripts/run_models.py
.venv/bin/python scripts/generate_plenoptic_demo.py
.venv/bin/python scripts/generate_bridgestan_demo.py
.venv/bin/python scripts/build_artifacts.py
.venv/bin/python scripts/execute_notebook.py
.venv/bin/python scripts/validate_artifacts.py
```

The public derivative keeps all eight reviewed unit IDs and source spike times,
downsamples LED1 position deterministically from 20 ms to 100 ms, and records
descriptive arrays separately from the leakage-safe predictive feature table.
The seeded synthetic fallback is a separate artifact with `origin: "synthetic"`;
it contains no fitted model scores and is never mixed with the public session.

Every release artifact must validate against the schemas in
[`../schemas`](../schemas), link its inputs by identifier and checksum, and pass
the deterministic rebuild checks before it is published.
