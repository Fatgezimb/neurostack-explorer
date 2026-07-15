# Limitations and boundaries

## Scientific status

NeuroStack Explorer is a personal educational and technical demonstration. It
is not:

- a laboratory or institutional research platform;
- a peer-reviewed publication or completed biological study;
- a medical device or clinical decision-support system;
- a source of diagnosis, treatment, risk assessment, or patient prediction;
- proof of biological mechanism, causality, or generalization; or
- evidence that Fatgezim Bela created the demonstrated open-source tools.

## What is verified

The source identity, CC BY 4.0 license, exact DANDI asset and checksum, species,
MEC LII region, 600-second support, 50 Hz source position stream, eight unit
IDs, deterministic public derivative, synthetic fallback, four computed model
lanes, BridgeStan surface, plenoptic synthesis, and executed Python 3.12.13
notebook are recorded.

This supports precise provenance, execution, and demonstration claims. It does
not support a causal, clinical, population, benchmark, or generalization claim.

## Data limitations

- The public derivative represents one 600-second session from one Long Evans
  rat and one MEC LII recording.
- It selects LED1 x/y and eight sorted units while omitting raw acquisition,
  250 Hz LFP, the second LED, subject weight, and other source content.
- `session_start_time` is a 1900 placeholder. Archive label `17010302` is not
  interpreted as a date.
- Subject weight `0.35/0.45` is ambiguous and excluded.
- Units resolution is unset; precision beyond stored spike times is not
  inferred.
- Decimation from 20 ms to 100 ms and fixed spike bins remove temporal detail.
- The compact JSON is transformed data, not the full source NWB file.
- The synthetic fallback tests software behavior and is not biological data.

## Descriptive-analysis limitations

- Occupancy-aware tuning depends on occupancy, binning, exclusions, and the
  chosen variable.
- ISI histograms do not identify neural mechanisms.
- Event-pair lags do not establish connectivity or causality.
- The unit feature map uses mean rate and ISI variability; it is not PCA or a
  learned population embedding.
- Descriptive speed uses sample-centered finite differences with one-sided
  endpoints. Predictive speed uses trailing-only differences. Substituting one
  for the other would change the temporal meaning.
- Browser filters can change the visible subset without rerunning the pipeline.

## Model limitations

- All reported scores cover only `t1c1`, four current-or-past features, one
  recording, and one frozen chronological split.
- The artifact includes a training-mean constant reference, but no
  history-only reference, alternate split, another session, or uncertainty
  interval around test deviance.
- The 1,499-row final test is temporally dependent; one held-out block cannot
  establish population-level generalization.
- PyTorch has the lowest deviance on this split, but that is not evidence of
  general superiority.
- NeMoS is fixed. scikit-learn alpha is selected by training-only chronological
  cross-validation. PyTorch uses outer validation for early stopping and
  architecture selection.
- The Stan lane fits every fifth training row. Its posterior depends on the
  Poisson-log likelihood and priors.
- Zero divergences, R-hat, and ESS do not prove model adequacy. The site ships
  a deterministic every-fifth-draw posterior display sample and a held-out
  posterior-predictive check, not every raw draw or a prior-sensitivity run.
- Display-strided residuals and one held-out predictive check are included, but
  no replicated calibration analysis is available.
- Prediction, coefficients, activations, gradients, and posterior summaries do
  not establish causal influence or neural mechanism.

## Separate illustrative branches

- BridgeStan evaluates a two-parameter compiled teaching model. Its 17×17
  surface and gradient check are real computations but have no biological
  interpretation.
- plenoptic uses a project-generated 24×24 procedural image and fixed Gaussian
  model. Its reduction in representation loss is not evidence of human
  perceptual equivalence.
- Neither branch extends the DANDI electrophysiology task.

## Execution and interaction limitations

- The public site does not execute arbitrary Python, expose a notebook kernel,
  train models, compile Stan, sample a posterior, or run synthesis on demand.
- Browser output is precomputed or a bounded client-derived view.
- The versioned mean Poisson deviances are valid artifact values. No runtime,
  GPU, accuracy, pseudo-R², causal, or deployment-performance claim follows.
- Stored prediction traces use every fifth test row for display. Metrics use all
  1,499 final-test rows.
- Essential chart information still needs semantic summaries, tables, keyboard
  access, and static or reduced-motion alternatives.

## Notebook limitations

The executed notebook verifies the public-derived and synthetic dataset JSON,
including embedded model records. It does not download the NWB source, refit
models, or independently load and verify the BridgeStan and plenoptic files.
It is an audit trail, not an unrestricted reproduction service.

## Reproducibility limitations

- Python 3.12.13 generation is recorded, but exact reproducibility across other
  hardware or future dependencies is not assumed.
- CmdStan 2.39.0 and BridgeStan’s C++ toolchain are compiled external
  dependencies outside the Python wheel lock.
- The provenance record has no release Git commit yet.
- Independent scientific review and complete frontend/accessibility QA remain
  outstanding release evidence.

## Security, privacy, and operations

The project accepts no untrusted NWB upload and collects no clinical or private
participant data. The full NWB remains outside Git and the public bundle.
Browser-visible configuration cannot protect secrets.

Deployment authorization is separate from successful artifact generation or a
web build. See [DEPLOYMENT.md](./DEPLOYMENT.md).
