# Data provenance

## Verified primary source

The public-data lane is pinned to one immutable DANDI release and exact NWB
asset. The machine-readable authority is
[`data/provenance.json`](./data/provenance.json).

| Field | Verified value |
| --- | --- |
| Dataset title | Conjunctive Representation of Position, Direction, and Velocity in Entorhinal Cortex |
| Authors | Francesca Sargolini; Marianne Fyhn; Torkel Hafting; Bruce L. McNaughton; Menno P. Witter; May-Britt Moser; Edvard I. Moser; Haagen Waade; Simon Ball |
| Repository | DANDI Archive |
| Dandiset / version | `000582` / `0.251111.2151` |
| Permanent identifier | <https://doi.org/10.48324/dandi.000582/0.251111.2151> |
| License | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Species | *Rattus norvegicus* (Long Evans rat) |
| Brain region | Medial entorhinal cortex, layer II (MEC LII) |
| Recording | Extracellular sorted spikes, LFP, and two-dimensional LED position |
| Session label | `17010302` (archive label, not interpreted as a date) |
| Asset path | `sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb` |
| Asset UUID | `2b9e441b-56bc-4be2-893e-0e02d22d239d` |
| NWB identifier | `294b7de1-a624-44d8-b1a1-28028dd2cf0c` |
| Source NWB version | `2.6.0` |
| Source byte size | 15,657,857 |
| Source SHA-256 | `43b3b435b953d22e276acc494af2926b63deaf15d2834531b2a87d08a8458a09` |
| Access date | 2026-07-14 |
| Private or clinical data | None selected |

The source remains in a user cache, outside ordinary Git and the public web
bundle. The pipeline fails closed if byte size or SHA-256 differs.

## Selected content

The derivative spans 600 seconds and includes:

- LED1 x/y from `/processing/behavior/Position/SpatialSeriesLED1`;
- 30,000 source position samples at 50 Hz;
- all spike times for `t1c1`, `t2c1`, `t2c3`, `t3c1`, `t3c2`, `t3c3`,
  `t3c4`, and `t4c1`; and
- project-derived descriptive speed, explicitly distinguished from source data
  and from the predictive trailing-speed feature.

The eight units contain 9,087 retained spikes. Counts in the order above are
1,759, 901, 1,547, 679, 776, 815, 1,731, and 879.

The derivative omits raw acquisition ElectricalSeries, 250 Hz LFP, the second
LED, ambiguous subject weight, and other source content.

## Source caveats

PyNWB 3.1.3 schema validation passed. NWB Inspector 0.7.2 completed with
recorded findings:

- `session_start_time` is a 1900 placeholder, not an acquisition date;
- subject weight `0.35/0.45` has no unit and is excluded;
- Units spike-time resolution is unset, so extra precision is not inferred;
- regular LED1 timestamps receive a best-practice suggestion.

The validation assessment is `share-with-caveats`; no blocking issues were
recorded. The immutable source is not silently repaired.

## Deterministic derivative transformation

`python/neurostack_explorer/artifacts.py`, invoked through
`python scripts/build_artifacts.py --download --inspect`, performs these steps:

1. verify source size and SHA-256;
2. apply SpatialSeries conversion `0.01` and offset `0.0` once;
3. select every fifth position sample without interpolation, producing 6,000
   samples at 10 Hz;
4. retain and serialize all selected spike times;
5. bin spikes in fixed left-closed/right-open 100 ms bins;
6. compute descriptive speed magnitude from sample-centered finite differences
   of 10 Hz x/y, one-sided at endpoints, without smoothing;
7. linearly interpolate descriptive speed at spike times for `t1c1` tuning;
8. compute the documented tuning, ISI, lag, rate, and descriptive feature-map
   arrays.

The first descriptive speed value is not defined as zero. That zero convention
belongs only to the separate predictive trailing-speed feature.

## Model transformation

`scripts/run_models.py` creates 5,999 rows for task `next-bin-count-v2`. It uses
current x, current y, trailing-only speed, and current `t1c1` count to predict
next-bin `t1c1` count. Trailing speed uses only current and previous positions
and starts at zero. Pynapple 0.11.3 verifies the binned count sequence.

Training-only scaling and the zero-based half-open split are recorded:

- train `[0,3600)`;
- validation `[3600,4200)`;
- 30-second gap `[4200,4500)`;
- final test `[4500,5999)`.

NeMoS/JAX, scikit-learn, PyTorch, and CmdStan outputs were actually computed.
They describe one selected unit, recording, and split.

## Generated artifacts

| Artifact | Origin | Size | SHA-256 | Status |
| --- | --- | ---: | --- | --- |
| `public/artifacts/v1/demo-dataset.json` | public-derived | 608,875 | `e56d1ded0dad948c2d3ddb82fc23b3ed2f1280dfc6f341c538ecf06a0c307e64` | passed |
| `public/artifacts/v1/synthetic-dataset.json` | synthetic | 83,895 | `ad63cff4be0401f28a53f215a414edf5df5f311ac66f4260306a915d46deda49` | passed |
| `public/artifacts/v1/model-results.json` | public-derived | 59,231 | `f52bb8738cd375a47aaa56dd4601f1f39d78f35fb10425ca4821d05869b57371` | computed |
| `public/artifacts/v1/bridgestan-surface.json` | illustrative | 9,067 | `1b7a465368d9b5c39e49fae1b0d30f00b1e250a7ea5038251a0edff2ff9fd971` | computed |
| `public/artifacts/v1/plenoptic-demo.json` | illustrative | 12,567 | `dec853e652b90a2945721fed15efe4bff8ff0b999a09d11c9c5b23415c786636` | computed |
| `public/artifacts/v1/neurostack-explorer.ipynb` | public-derived walkthrough | 46,419 | `be764562f28d3a340893ed93e5f4992804016a1d1af0e9934b05398204a10dbd` | executed |
| `public/artifacts/v1/notebook-manifest.json` | verification record | 2,040 | `cbf1cdbac8226a99551fd8f703b14dc9916391591718eff76cfed8ffdd4ea737` | executed |
| `data/provenance.json` | provenance record | 8,045 | `8c248bfafddd701696604b738e5d0fce8bb36f3aedd498fd5f8084ea71a131ca` | verified |
| `data/validation-report.json` | validation record | 7,173 | `92ce95db517e97ba6e8230d0c3f691a6f57f90ea0e721969e6e0f4732f1ecf52` | share-with-caveats |

The public dataset artifact remains under the source CC BY 4.0 attribution
requirement. The synthetic fallback is project-generated and nonbiological.
The BridgeStan fixture and plenoptic procedural input are illustrative and not
continuations of the electrophysiology analysis.

## Notebook scope

The executed notebook has 15 named sections and runs on Python 3.12.13 without
cell errors. It checksum-validates and opens the cached NWB source, reconstructs
Pynapple objects, refits the deterministic NeMoS, scikit-learn, and PyTorch
lanes, inspects the committed Stan posterior and predictive check, and renders a
Plotly output. It does not rerun Stan sampling, BridgeStan compilation, or
plenoptic synthesis.

## Browser boundary

The browser never receives the full NWB source. It may select, filter, brush,
bin, or summarize committed arrays. Those operations remain client-derived
views and do not imply live Python, posterior sampling, or model training.

## Chain of custody

```text
DANDI immutable version + exact asset UUID/path
  -> verified 15,657,857 bytes + source SHA-256
  -> PyNWB validation + retained NWB Inspector findings
  -> documented 10 Hz derivative + centered descriptive speed
  -> frozen trailing-speed next-bin model table
  -> checksummed public, model, and illustrative artifacts
  -> bounded browser views + executed verification notebook
```

## Validation evidence

- [x] source identity, DOI, license, exact asset, size, and SHA-256 recorded;
- [x] PyNWB schema validation and NWB Inspector review completed;
- [x] selected units, time base, transformations, and exclusions recorded;
- [x] public and synthetic derivatives generated deterministically;
- [x] four aligned model lanes generated on the frozen task and split;
- [x] BridgeStan gradient check and plenoptic synthesis generated;
- [x] schemas, manifests, provenance, validation report, and notebook validate;
- [x] Python 3.12.13 generation and notebook execution recorded;
- [ ] attach a reviewed release Git commit to the generation record;
- [ ] complete frontend accessibility, browser, and deployment review.
