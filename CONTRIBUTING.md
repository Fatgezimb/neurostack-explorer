# Contributing

Thank you for helping improve NeuroStack Explorer. Contributions must preserve
its evidence-first scientific and accessibility boundaries.

## Before starting

1. Read [AGENTS.md](./AGENTS.md), [PLANS.md](./PLANS.md),
   [METHODS.md](./METHODS.md), and [DATA_PROVENANCE.md](./DATA_PROVENANCE.md).
2. Check the current working tree and avoid overwriting unrelated changes.
3. Identify whether the change affects a dataset claim, model result, generated
   artifact, public route, accessibility behavior, or deployment surface.
4. Open an issue or obtain owner direction before making a destructive data,
   architecture, license, or hosting decision.

## Scientific claims

- Link every factual dataset or software claim to a direct source record.
- Do not invent performance, findings, biological interpretations, publication
  status, affiliations, or tool capabilities.
- Preserve the verified DANDI `000582@0.251111.2151` identity, exact asset UUID,
  path, SHA-256, CC BY 4.0 license, 600-second support, 20 ms source sampling,
  and eight unit IDs unless a documented source-review change deliberately
  replaces them.
- Keep genuinely unresolved baseline, alternate-split, diagnostic, release, and
  QA fields open until their artifacts and evidence exist.
- Label outputs as computed, cached, synthetic, illustrative, or derived from
  public data.
- Record units, sample definitions, exclusions, transformations, uncertainty,
  and limitations beside results.
- Never describe synthetic fallback output as observed neuroscience data.

## Data contributions

Do not commit large source NWB files, private URLs, signed links, credentials,
clinical records, participant identifiers, PHI, or other restricted data.

A proposed dataset change must include:

- official repository and permanent identifier;
- exact asset or session;
- license and reuse analysis;
- source checksum and access date;
- metadata and suitability review;
- estimated download and derivative size;
- deterministic fetch, validation, and derivative plan;
- privacy and identification review.

Generated artifacts must conform to the contracts in `schemas/` and link to
their source inputs by immutable identifier or checksum.

The current source NWB stays outside Git. Reuse of its public-derived artifact
must retain DANDI attribution and CC BY 4.0; the repository MIT license applies
to project code and project-authored documentation, not to third-party data.

## Model contributions

A model change must state the task, target, observation unit, feature boundary,
split design, leakage controls, baseline, metrics, tuning process, seeds,
hardware, and artifact outputs. Never fit transformations on held-out data or
select a model using final test performance.

The computed shared task is `next-bin-count-v2`: predict `t1c1` spike count in
the next 100 ms bin from current x, current y, trailing-only speed, and current
`t1c1` count. Its 5,999 rows use train `[0,3600)`, validation `[3600,4200)`, a
30-second gap `[4200,4500)`, and final test `[4500,5999)`. Scaling is fit on
training only; validation is used only for PyTorch early stopping. Changing the
target, feature timing, frozen split, or using random row shuffling is a
reviewed methods change, not a local implementation detail.

The current artifact has no naive reference, alternate split, residual-series
artifact, calibration artifact, posterior-predictive simulation, or
prior-sensitivity analysis. Do not synthesize those missing results in the
browser.

If a result changes, regenerate the model record, documentation, charts, tables,
checksums, and notebook outputs together.

## Frontend contributions

- Use semantic HTML and preserve server-rendered explanatory content.
- Keep charts purposeful and label units and sample sizes.
- Provide a textual summary and accessible data alternative for each chart.
- Support keyboard, touch, reduced motion, high zoom, and narrow screens.
- Do not make Canvas, WebGL, hover, color, or animation the only information
  channel.
- Lazy-load heavy visualization modules and avoid blocking initial reading.
- Keep user-controlled smoothing, filtering, and binning explicit and shareable.

## Local verification

Run the applicable commands from a clean enough state to distinguish your
changes from pre-existing failures:

```bash
make schemas
make verify-web
make verify-python
make verify
```

The full Python lock, deterministic dataset pipeline, synthetic fallback,
NeMoS/JAX, scikit-learn, PyTorch, CmdStan, BridgeStan, plenoptic artifacts, and
executed verification notebook exist. Regeneration must preserve their origin,
execution labels, split, versions, and hashes or deliberately update all linked
records. Never replace a failed computation with a passing no-op or a
result-shaped illustrative score.

Browser-facing work also requires representative mobile and desktop checks,
keyboard navigation, reduced motion, no-JavaScript or static fallback review,
contrast, chart alternatives, console inspection, and link validation.

## Pull request checklist

- [ ] Scope and scientific purpose are clear.
- [ ] No unrelated owner work was overwritten.
- [ ] Claims are source-backed and limitations are visible.
- [ ] Data and generated artifacts validate against current schemas.
- [ ] Seeds, commands, versions, and checksums are recorded.
- [ ] Tests cover changed transformations or interactions.
- [ ] Accessibility and responsive behavior were reviewed.
- [ ] No secrets, private data, restricted assets, or oversized files were added.
- [ ] Documentation and citations were updated.
- [ ] Deployment configuration and access policy were not changed without
      explicit owner approval.

## Code of conduct

Use respectful, precise, and constructive communication. Discuss limitations
and mistakes directly without overstating certainty or expertise. A formal code
of conduct may be added before public community contributions are opened.
