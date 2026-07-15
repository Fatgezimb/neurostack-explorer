# NeuroStack Explorer

NeuroStack Explorer is a personal scientific-software portfolio project by
Fatgezim “Zim” Bela. It follows one pinned public neurophysiology recording
through validation, deterministic browser derivatives, descriptive analyses,
four precomputed model lanes, and two separate illustrative demonstrations.

This repository is not a laboratory, medical device, diagnostic product,
validated patient-level model, published study, or institutional platform. It
does not claim that Zim created the open-source libraries it demonstrates.

## Current evidence status

Computed and recorded on 2026-07-14:

- DANDI Dandiset `000582`, immutable version `0.251111.2151`, DOI
  <https://doi.org/10.48324/dandi.000582/0.251111.2151>, under CC BY 4.0;
- asset `sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb`, UUID
  `2b9e441b-56bc-4be2-893e-0e02d22d239d`, 15,657,857 bytes, SHA-256
  `43b3b435b953d22e276acc494af2926b63deaf15d2834531b2a87d08a8458a09`;
- a 600-second Long Evans rat MEC LII recording with 30,000 LED1 position
  samples at 50 Hz and 9,087 spikes from eight selected units;
- a deterministic 6,000-sample, 10 Hz public derivative and a seeded synthetic
  fallback;
- NeMoS, scikit-learn, PyTorch, and Stan outputs on one frozen next-bin task;
- a compiled BridgeStan two-parameter interface demonstration and a real
  plenoptic synthesis using a project-generated procedural image;
- an executed, sanitized, read-only notebook on Python 3.12.13; and
- manifests, provenance, validation records, schemas, tests, and checksums.

The overall scientific sharing assessment is `share-with-caveats`. The source
has a placeholder 1900 session date, ambiguous subject weight that is excluded,
unset Units resolution, and a regular-timestamps suggestion. The model scores
cover one selected unit, one recording, and one split; they are demonstrations,
not benchmark rankings, causal evidence, or population findings.

The machine-readable authority is
[`public/artifacts/v1/manifest.json`](./public/artifacts/v1/manifest.json), not
marketing copy.

## Architecture

1. Next.js and TypeScript render the explanatory site and bounded scientific
   interactions.
2. A pinned Python 3.12 environment validates the NWB asset and runs the
   offline scientific pipeline.
3. Versioned, checksummed files cross into the browser through the contracts in
   [`schemas/`](./schemas/).
4. The browser replays precomputed results or performs bounded operations such
   as selection, filtering, brushing, or deterministic aggregation. It does not
   execute arbitrary Python, expose a public notebook kernel, or refit models.

No FastAPI service, database, authentication layer, paid API, or user upload is
required.

## Scientific workflow

```text
DANDI:000582/0.251111.2151 + pinned NWB checksum
  -> PyNWB schema validation + NWB Inspector review
  -> deterministic 600 s compact derivative + synthetic fallback
  -> descriptive arrays from spike times, LED1 x/y, and centered speed
  -> frozen next-bin-count-v2 table using trailing-only predictive speed
  -> NeMoS + scikit-learn + compact PyTorch + Stan
  -> separate BridgeStan compiled-interface demonstration
  -> separate plenoptic procedural-image synthesis
  -> checksummed browser artifacts + executed verification notebook
```

## Dataset derivative and speed definitions

Every fifth 50 Hz position sample is selected without interpolation, yielding
6,000 samples at 10 Hz. The NWB conversion `0.01` and offset `0.0` are applied
exactly once. All spike times are retained for:

`t1c1`, `t2c1`, `t2c3`, `t3c1`, `t3c2`, `t3c3`, `t3c4`, `t4c1`.

The descriptive artifact computes speed magnitude from sample-centered finite
differences of the 10 Hz x/y series, with one-sided endpoints and no smoothing;
speed is linearly interpolated at spike timestamps for tuning. The predictive
table deliberately uses a different, trailing-only speed from the current and
previous positions, with its initial value set to zero, so no future position
enters a feature.

## Computed model task

Task `next-bin-count-v2` predicts the `t1c1` spike count in the next 100 ms bin
from current-bin x, current-bin y, trailing-only speed, and current-bin `t1c1`
count. Training-only means and standard deviations scale the four features.

The 5,999 rows use zero-based half-open intervals:

- train `[0,3600)`;
- frozen validation `[3600,4200)`;
- 30-second gap `[4200,4500)`;
- untouched final test `[4500,5999)` with 1,499 rows.

Validation selects PyTorch checkpoints and architecture. scikit-learn alpha is
selected only by three expanding-window folds inside the training block. Fixed
NeMoS and Stan configurations report validation without tuning on it.
The primary displayed metric is mean Poisson deviance on all 1,499 final-test
rows. Stored traces use stride 5 for display only.

| Lane | Validation deviance | Final-test deviance |
| --- | ---: | ---: |
| NeMoS 0.2.9 / JAX 0.10.1 | 0.759256 | 0.848559 |
| scikit-learn 1.9.0 | 0.764638 | 0.853491 |
| PyTorch 2.12.1 CPU | 0.694164 | 0.778533 |
| CmdStanPy 1.3.0 / CmdStan 2.39.0 | 0.772936 | 0.850890 |

These values do not establish a winner. A leakage-safe training-mean reference
is included; alternate splits, uncertainty around test deviance, and
out-of-session evaluation are not.

## Artifact checksums

| Artifact | SHA-256 |
| --- | --- |
| `demo-dataset.json` | `e56d1ded0dad948c2d3ddb82fc23b3ed2f1280dfc6f341c538ecf06a0c307e64` |
| `synthetic-dataset.json` | `ad63cff4be0401f28a53f215a414edf5df5f311ac66f4260306a915d46deda49` |
| `model-results.json` | `f52bb8738cd375a47aaa56dd4601f1f39d78f35fb10425ca4821d05869b57371` |
| `bridgestan-surface.json` | `1b7a465368d9b5c39e49fae1b0d30f00b1e250a7ea5038251a0edff2ff9fd971` |
| `plenoptic-demo.json` | `dec853e652b90a2945721fed15efe4bff8ff0b999a09d11c9c5b23415c786636` |
| executed notebook | `be764562f28d3a340893ed93e5f4992804016a1d1af0e9934b05398204a10dbd` |

## Local setup

Requirements are Node.js `>=22.13.0`, Python `3.12.x`, npm, the committed Node
lockfile, and the committed Python lock.

```bash
npm ci
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.lock
npm run dev
```

Follow [INSTALL.md](./INSTALL.md) for source caching, artifact generation, and
verification. The immutable source NWB remains outside Git.

## Documentation

- [METHODS.md](./METHODS.md) — transformations, task, models, and evidence rules
- [DATA_PROVENANCE.md](./DATA_PROVENANCE.md) — source-to-artifact chain
- [MODEL_CARD.md](./MODEL_CARD.md) — exact model configuration and limits
- [LIMITATIONS.md](./LIMITATIONS.md) — scientific and product boundaries
- [CITATIONS.md](./CITATIONS.md) — dataset and software ledger
- [ACCESSIBILITY.md](./ACCESSIBILITY.md) — accessible-interface requirements
- [DEPLOYMENT.md](./DEPLOYMENT.md) — release gates and authorization boundary
- [CONTRIBUTING.md](./CONTRIBUTING.md) — evidence-first contribution workflow

## License

Project code and project-authored documentation are MIT licensed, copyright
2026 Fatgezim Bela. The DANDI source and public-derived data remain under CC BY
4.0. Third-party software retains its own license.
