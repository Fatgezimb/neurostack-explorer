# Methods

## Status and scope

The pinned source, deterministic derivative, aligned model artifact, separate
BridgeStan and plenoptic demonstrations, and executed notebook exist and pass
their artifact validators. The overall public-data assessment is
`share-with-caveats`, with no blocking issues.

NeuroStack Explorer is an educational technical demonstration. It is not a
clinical study, diagnostic system, validated biological finding, or substitute
for peer-reviewed analysis.

## Method principles

1. **Pin bytes, not merely a URL.** Source identity includes the immutable
   Dandiset version, asset UUID, path, byte size, and SHA-256.
2. **Keep source and derivative distinct.** Every field selection and
   transformation is recorded; the compact JSON is never called untouched NWB.
3. **Keep temporal direction explicit.** Descriptive centered speed and
   predictive trailing-only speed answer different needs and are not conflated.
4. **Protect the final test.** Scaling is learned on training rows only;
   validation and test rows remain chronologically blocked behind a gap.
5. **Keep origin separate from execution.** Public-derived, synthetic, and
   illustrative origins are distinct from precomputed or client-derived work.
6. **Precompute scientific work.** The browser loads versioned outputs and
   performs only bounded display transformations.

## 1. Source acquisition

The primary source is DANDI Dandiset `000582`, immutable published version
`0.251111.2151`, “Conjunctive Representation of Position, Direction, and
Velocity in Entorhinal Cortex,” under CC BY 4.0.

| Field | Value |
| --- | --- |
| DOI | <https://doi.org/10.48324/dandi.000582/0.251111.2151> |
| Path | `sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb` |
| Asset UUID | `2b9e441b-56bc-4be2-893e-0e02d22d239d` |
| NWB identifier | `294b7de1-a624-44d8-b1a1-28028dd2cf0c` |
| Byte size | 15,657,857 |
| SHA-256 | `43b3b435b953d22e276acc494af2926b63deaf15d2834531b2a87d08a8458a09` |
| Access date | 2026-07-14 |

`scripts/build_artifacts.py` reads a verified cache or explicitly permitted
download and fails before analysis if the byte size or checksum differs. The
source remains outside Git and is not served to visitors.

## 2. Source validation and caveats

PyNWB 3.1.3 schema validation passed without errors. NWB Inspector 0.7.2
completed with four retained findings:

- `session_start_time` is a 1900 placeholder, not an acquisition date;
- subject weight `0.35/0.45` has no unit and is excluded;
- the Units table does not declare spike-time resolution;
- the regular LED1 timestamp series triggers a best-practice suggestion.

Only LED1 x/y is selected. Head direction and the second LED are not derived.
Archive label `17010302` is not interpreted as a date.

## 3. Deterministic public derivative

The selected 600-second recording is extracellular electrophysiology from a
Long Evans rat in MEC LII. The derivative:

1. reads `/processing/behavior/Position/SpatialSeriesLED1`;
2. applies conversion `0.01` and offset `0.0` exactly once to obtain meters;
3. selects every fifth sample, taking 30,000 values at 50 Hz to 6,000 values at
   10 Hz without interpolation;
4. retains every spike time for eight units—`t1c1`, `t2c1`, `t2c3`, `t3c1`,
   `t3c2`, `t3c3`, `t3c4`, and `t4c1`—for 9,087 spikes total; and
5. bins spikes in fixed left-closed/right-open 100 ms intervals, with the final
   600-second edge handled by the recorded NumPy histogram convention.

Per-unit retained spike counts are 1,759, 901, 1,547, 679, 776, 815, 1,731,
and 879 in the unit order above.

### Descriptive speed

The descriptive artifact computes x and y derivatives with `np.gradient` on
the 10 Hz series. Interior samples therefore use sample-centered finite
differences; endpoints are one-sided. Speed is the magnitude of those two
derivatives. No smoothing is applied. Speed is linearly interpolated at spike
timestamps for the occupancy-aware `t1c1` tuning curve.

This is deliberately different from predictive speed below.

### Descriptive analyses

The public artifact also contains:

- population rate from fixed 100 ms bins;
- occupancy-aware descriptive speed tuning for `t1c1`;
- a 0–2 second inter-spike-interval histogram for `t1c1`;
- an event-pair lag histogram for `t1c1` versus `t2c1` over ±0.25 seconds; and
- a unit feature map from z-scored mean rate and ISI coefficient of variation.

The feature map is not PCA or a learned embedding. Tuning and lag patterns do
not establish causality, navigation mechanism, or synaptic connectivity.

## 4. Synthetic fallback

The deterministic fallback uses seed `20260714`, 1,200 position samples, and
four generated spike trains. It carries no DANDI identity and is not biological
data. It exists for availability and interface tests, never for a public-data
performance claim.

## 5. Frozen model task

Task `next-bin-count-v2` predicts `t1c1` spike count in the next 100 ms bin.
There are 5,999 eligible rows and four predictors:

1. current-bin x position in meters;
2. current-bin y position in meters;
3. trailing-only speed from current and previous 10 Hz positions in m/s; and
4. current-bin `t1c1` spike count.

Trailing-only speed starts at zero and never uses a future position. The four
features are standardized with means and standard deviations estimated from
the training block only.

The zero-based half-open split is:

| Partition | Rows | Count |
| --- | --- | ---: |
| Train | `[0,3600)` | 3,600 |
| Frozen validation | `[3600,4200)` | 600 |
| Temporal gap | `[4200,4500)` | 300 / 30 seconds |
| Untouched final test | `[4500,5999)` | 1,499 |

Pynapple 0.11.3 independently reconstructs and verifies the 100 ms `t1c1`
count sequence. PyNWB/NumPy remain the generators of the descriptive artifact.

The metric is mean Poisson deviance on all 1,499 final-test rows. Prediction
traces store every fifth test row, 300 points, for display only. Validation
selects PyTorch early-stopping checkpoints and then the main architecture.
scikit-learn alpha is selected by chronological cross-validation contained
entirely within training. Fixed NeMoS and Stan configurations report validation
without tuning on it. Final-test outcomes do not select any configuration.

## 6. Executed model lanes

### NeMoS 0.2.9 / JAX 0.10.1

Poisson GLM with exponential inverse link, Ridge strength `0.01`, LBFGS,
float64, tolerance `1e-8`, and maximum 500 iterations. Validation deviance is
`0.759256`; final-test deviance is `0.848559`.

An isolated NeMoS API explorer evaluates `RaisedCosineLinearEval`,
`BSplineEval`, and `MSplineEval` with four and six functions on a 41-point
normalized coordinate. The generated artifact records six curve sets, their
feature names, and sampled design-matrix rows. These matrices are not used in
the frozen four-raw-feature GLM or its scores.

### scikit-learn 1.9.0

The fixed alpha grid `[0, 0.001, 0.01, 0.1]` is audited in three expanding
windows inside training: `[0,900)→[900,1800)`, `[0,1800)→[1800,2700)`, and
`[0,2700)→[2700,3600)`. Each fold fits its scaler on fold-training rows only.
Mean fold-validation deviances are `0.98539486`, `0.98530769`, `0.98457378`,
and `0.98073854`; the declared minimum-mean rule selects `alpha=0.1` before
outer validation or test evaluation. The refit uses
`PoissonRegressor(max_iter=1000, tol=1e-9)`. Validation deviance is `0.764638`;
final-test deviance is `0.853491`.

The intercept-only reference predicts the outer-training target mean
`0.31305556`. Its validation and final-test deviances are `0.90040952` and
`1.11198088`. It reads no validation or test targets when setting its constant.

### PyTorch 2.12.1

Three deterministic CPU float64 candidates use Adam at `0.02`, seed `20260714`,
and patience 50. The no-hidden 4–1 softplus candidate records validation/test
deviance `0.73188899 / 0.80960662`; the unregularized 4–8–1 tanh/softplus MLP
records `0.69461018 / 0.77887146`; and the 4–8–1 MLP with weight decay `0.001`
records `0.69416416 / 0.77853303`. Best/completed epochs are `92/142`, `22/72`,
and `22/72`, respectively.

The declared selection rule minimizes validation deviance, then favors fewer
parameters and lexical candidate ID for a tie. It selects the regularized
4–8–1 candidate before the code computes final-test metrics for all three. A
saved activation example for final-test row 4500 records the standardized
input, hidden pre-activation, tanh activation, output pre-activation, and
softplus prediction from the selected state.

### CmdStanPy 1.3.0 / CmdStan 2.39.0

The aligned Poisson-log model uses `alpha ~ normal(-1, 1.5)` and
`beta ~ normal(0, 1)`. It fits every fifth training row with two chains, 500
warmup and 500 sampling draws per chain, `adapt_delta=0.9`, and seed `20260714`.
The compact artifact stores posterior summaries and a deterministic
every-fifth-draw display sample (200 values per parameter from 1,000 source
draws), not every raw draw. It records zero divergences, maximum R-hat
`1.01129`, and minimum bulk ESS `887.091`.
Validation deviance is `0.772936`; posterior-mean final-test deviance is
`0.850890`.

Posterior predictive simulation uses all 1,000 post-warmup parameter draws and
seed `20260815`. The artifact stores the displayed held-out 5th, 50th, and 95th
predictive-count quantiles. Observed total held-out count is `398`, below the
empirical predictive total interval `428.0–581.1` (median `499.0`). Row-wise
central 90% predictive coverage is `1,443 / 1,499` (`0.96264176`), but these
discrete, broad intervals do not resolve the aggregate mismatch. They are
predictive intervals, not confidence intervals.

Every raw posterior draw, a prior-sensitivity run, alternate splits,
uncertainty on test deviance, and external validation are not shipped. The four
fitted scores do not establish a winner.

## 7. Separate BridgeStan demonstration

BridgeStan 2.9.0 evaluates the compiled two-parameter program at
`python/stan/bridge_surface.stan`. The target is independent standard-normal
terms plus `0.35` times the parameter product; it has no biological meaning.
The artifact stores a 17×17 grid over `[-2,2]²`, Jacobian `true`, propto
`false`, and nine deterministic gradient-ascent evaluations. A central
finite-difference check at epsilon `1e-6` passed with maximum absolute error
`2e-10`.

## 8. Separate plenoptic demonstration

plenoptic 2.0.1 with PyTorch 2.12.1 runs `plenoptic.Metamer` on a deterministic
project-generated 24×24 grayscale image. No external or human-subject image is
used. The fixed eval-mode model is `plenoptic.models.Gaussian` with kernel size
9 and standard deviation 2.0. A fixed 0.05-to-0.95 ramp initializes Adam
(`lr=0.02`, `amsgrad=True`) for 80 iterations with checkpoints every 10.

Representation loss changes from `0.0660647005` to `0.0000371706`; pixel MSE
is `0.0040655542`. Similarity under this fixed model is not evidence of human
perceptual equivalence and is unrelated to the DANDI electrophysiology task.

## 9. Notebook and browser boundary

The executed notebook contains 29 cells across 15 named sections, including 14 code cells, and no
errors. Python 3.12.13 generated its normalized, sanitized output. It loads the
public-derived and synthetic dataset JSON, verifies provenance fields, shapes,
units, checksum declarations, synthetic separation, and embedded computed model
records. It does not download the NWB source, refit models, or load and verify
the separate BridgeStan or plenoptic artifacts.

The browser similarly replays committed artifacts. Selection, filtering,
binning, and smoothing controls must identify themselves as bounded display
operations rather than model fitting.

## 10. Machine-readable record

- `data/provenance.json` records the pinned source, derivative, generator, lock,
  and notebook identities;
- `data/validation-report.json` records validation status and artifact hashes;
- `public/artifacts/v1/manifest.json` is the current checksum index;
- `public/artifacts/v1/model-results.json` records SHA-256 hashes for
  `scripts/run_models.py`, `python/neurostack_explorer/modeling.py`, the Stan
  source, and `requirements.lock`; and
- machine-readable contracts live under `schemas/`.

The current model record has no release Git commit because this repository has
no commit yet. Regeneration after a reviewed release commit must attach that
identity rather than inferring one.
