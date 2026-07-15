# Model card

## Status

`public/artifacts/v1/model-results.json` contains four computed, precomputed
model lanes for one selected unit and one fixed split. Its SHA-256 is
`c6e3836b09ddb448c04a68f53186bd82893d6d3a88b3d6d2cac985af3f987ff3`.

| Field | Recorded value |
| --- | --- |
| Dataset | DANDI `000582`, immutable version `0.251111.2151` |
| Recording | One 600-second Long Evans rat MEC LII session |
| Selected unit | `t1c1` |
| Task version | `next-bin-count-v2` |
| Target | `t1c1` spike count in the next 100 ms bin |
| Equivalent rate | Count divided by fixed 0.1 s exposure |
| Eligible rows | 5,999 chronological 100 ms observations |
| Inputs | Current x, current y, trailing-only speed, current `t1c1` count |
| Preprocessing | Training-only mean and standard deviation |
| Split | Train `[0,3600)`, validation `[3600,4200)`, gap `[4200,4500)`, test `[4500,5999)` |
| Test size | 1,499 rows |
| Metric | Mean Poisson deviance on all final-test rows; lower is better |
| Display trace | Every fifth test row, 300 points; metrics are not decimated |
| Naive baseline | Training-target mean, computed without validation or test targets |
| Intended use | Educational technical demonstration |
| Clinical use | Prohibited |

The selected source asset is
`sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb`, UUID
`2b9e441b-56bc-4be2-893e-0e02d22d239d`, SHA-256
`43b3b435b953d22e276acc494af2926b63deaf15d2834531b2a87d08a8458a09`.

## Temporal and leakage boundary

Predictors are available at or before the current bin. The predictive speed is
the distance from the previous 10 Hz position to the current position divided
by 0.1 s; its first value is zero. It does not use the sample-centered speed in
the descriptive artifact because that centered calculation sees a following
position at interior samples.

Feature means and standard deviations are fit on rows `[0,3600)` only. The
30-second gap separates validation from the final test. Validation selects each
PyTorch early-stopping checkpoint and then the main PyTorch architecture.
scikit-learn regularization is selected only by three expanding-window folds
inside the outer training block. The fixed NeMoS and Stan configurations report
validation without tuning on it. No model or configuration is selected using
final-test outcomes.

Pynapple 0.11.3 independently verifies the 100 ms `t1c1` count table used by
the task.

## Comparable predictive lanes

| Lane | Configuration | Validation deviance | Final-test deviance |
| --- | --- | ---: | ---: |
| Training-mean reference | Constant from outer-training targets only | 0.900410 | 1.111981 |
| NeMoS 0.2.9 / JAX 0.10.1 | Poisson, exponential inverse link, Ridge 0.01, LBFGS, float64 | 0.759256 | 0.848559 |
| scikit-learn 1.9.0 | `PoissonRegressor(alpha=0.1)` after training-only CV | 0.764638 | 0.853491 |
| PyTorch 2.12.1 | Validation-selected CPU float64 regularized 4–8–1 MLP | 0.694164 | 0.778533 |
| CmdStanPy 1.3.0 / CmdStan 2.39.0 | Poisson-log, explicit priors, posterior-mean prediction | 0.772936 | 0.850890 |

These rows share the target, four-feature table, split, and metric. Numerical
differences on this single test block do not establish a generally superior
method.

### NeMoS

The frozen GLM uses an exponential inverse link and Ridge penalty `0.01`,
optimized by LBFGS with tolerance `1e-8` and at most 500 iterations. No basis
expansion is used in that fit. Coefficients and held-out predictions are stored
in the artifact.

The separate basis explorer executes NeMoS 0.2.9's
`RaisedCosineLinearEval`, `BSplineEval`, and `MSplineEval` APIs with four and
six basis functions over a normalized 41-point coordinate. The artifact stores
all six curve sets, feature names, and five-row design-matrix samples. These
basis matrices are an API demonstration and are explicitly not inputs to the
fitted or scored GLM.

### scikit-learn

The alpha grid is `[0, 0.001, 0.01, 0.1]`. Three expanding-window folds remain
entirely inside outer-training rows `[0,3600)`: `[0,900)→[900,1800)`,
`[0,1800)→[1800,2700)`, and `[0,2700)→[2700,3600)`. Each fold fits its own
mean and standard deviation on fold-training rows. Mean fold-validation
deviances are `0.98539486`, `0.98530769`, `0.98457378`, and `0.98073854` in
grid order, so the declared lowest-mean rule selects `alpha=0.1`. Outer
validation and final-test outcomes do not participate in that selection.

The training-mean intercept-only reference predicts `0.31305556` counts for
every row. Its validation and final-test deviances are `0.90040952` and
`1.11198088`. The constant is derived only from outer-training targets; it is
not a tuned model.

### PyTorch

Three predeclared candidates use Adam at learning rate `0.02`, seed `20260714`,
CPU float64, deterministic algorithms, and early-stopping patience 50:

| Candidate | Weight decay | Best / completed epochs | Validation deviance | Final-test deviance |
| --- | ---: | ---: | ---: | ---: |
| No-hidden-layer 4–1 softplus | 0 | 92 / 142 | 0.73188899 | 0.80960662 |
| 4–8–1 tanh/softplus MLP | 0 | 22 / 72 | 0.69461018 | 0.77887146 |
| Regularized 4–8–1 tanh/softplus MLP | 0.001 | 22 / 72 | 0.69416416 | 0.77853303 |

The declared rule chooses the lowest outer-validation deviance, with ties
resolved by fewer parameters and then candidate ID. It therefore selects the
regularized 4–8–1 candidate before final-test metrics are evaluated. The
artifact records all three configurations and held-out scores; it does not use
those held-out scores for selection. The selected model's genuine forward-pass
record for row 4500 includes four standardized inputs, eight hidden
pre-activations and tanh activations, output pre-activation, and softplus
prediction. No GPU or runtime claim is made.

### Stan

The Poisson-log program uses `alpha ~ normal(-1, 1.5)` and
`beta ~ normal(0, 1)`. Training is subsampled at stride 5. Two chains each run
500 warmup and 500 sampling draws with `adapt_delta=0.9` and seed `20260714`.
The compact artifact contains posterior summaries plus a deterministic
every-fifth-draw display sample (200 values per parameter from 1,000 source
draws), rather than every raw draw. It records zero divergences, maximum R-hat
`1.01129`, and minimum bulk ESS `887.091`.

A deterministic posterior predictive check uses all 1,000 post-warmup
parameter draws and Poisson simulation seed `20260815`. For the 1,499 held-out
rows, it stores displayed 5th, 50th, and 95th predictive-count quantiles plus
an HTML-friendly summary. The observed total is `398`; the empirical
predictive total interval is `428.0–581.1` with median `499.0`. Thus the
observed total falls below this predictive interval, direct evidence of lack of
fit for this held-out aggregate. The row-wise central 90% predictive interval
contains `1,443 / 1,499` observations (`0.96264176`), but the intervals are
discrete and broad; that coverage does not erase the total-count mismatch or
establish general calibration. These are predictive intervals, not confidence
intervals.

Sampler diagnostics support reporting the stored summary but do not establish
likelihood adequacy, prior robustness, calibration, or biological truth. No
prior-sensitivity run is claimed.

## Missing evaluation evidence

The artifact does not include:

- a history-only reference beyond the fitted current-count predictor;
- uncertainty around the final-test deviance;
- alternate chronological splits or another recording;
- a full residual-series or calibration analysis;
- raw posterior draws or prior-sensitivity runs; or
- prospective, population-level, or external validation.

Those omissions materially limit comparison. The browser must not fill them
with result-shaped illustrative values.

## Separate BridgeStan interface artifact

`bridgestan-surface.json` is computed but is not a model row for the DANDI
task. BridgeStan 2.9.0 evaluates a compiled two-parameter illustrative model on
a 17×17 grid. A finite-difference gradient check passes with maximum absolute
error `2e-10`, and the artifact includes nine deterministic gradient-ascent
evaluations. The parameters have no biological interpretation.

## Separate plenoptic artifact

`plenoptic-demo.json` is a computed visual-model demonstration, not an input,
estimator, target, or metric for the neural task. It uses a project-generated
procedural 24×24 image, a fixed Gaussian representation, and 80 Metamer
iterations. Model-representation similarity is not human perceptual
equivalence.

## Fair-comparison rules

- Keep the target, eligible rows, feature timing, split, and metric identical.
- Fit every learned transform within the training boundary.
- Keep the final test out of configuration and architecture selection.
- Report all computed lanes and do not declare a winner from this one split.
- Treat Stan posterior and predictive summaries as conditional on the model and priors.
- Keep BridgeStan, plenoptic, and synthetic outputs outside the public-data comparison.

## Interpretive limits

Next-bin prediction is association, not causality. Coefficients, activations,
gradients, posterior summaries, and predictive checks do not establish neural
mechanism, navigation strategy, clinical relevance, or generalization beyond
this one public session.

## Machine-readable record

The four-lane aggregate result is validated against the model-bundle branch of
[`schemas/scientific-artifact-bundle.schema.json`](./schemas/scientific-artifact-bundle.schema.json).
It links to the exact input fingerprint and source identity and keeps
`public-derived` origin separate from `precomputed` execution. The separate
`model-result.schema.json` remains a reusable single-model record contract; it
is not presented as the schema for this aggregate file.

`generatorProvenance` records SHA-256 hashes for `scripts/run_models.py`,
`python/neurostack_explorer/modeling.py`,
`python/stan/poisson_encoding.stan`, and `requirements.lock`. The Git commit is
`null` because this repository has no commit yet; the artifact does not invent
one.
