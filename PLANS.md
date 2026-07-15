# NeuroStack Explorer implementation plan

Last reviewed: 2026-07-15

This plan tracks implementation evidence. A checked route skeleton, generated
file, or screenshot does not by itself satisfy a scientific or usability phase.

## Current decisions

- [x] Maintain NeuroStack Explorer as a standalone sibling repository.
- [x] Use a Next.js/TypeScript frontend with offline Python-generated artifacts
      as the default architecture.
- [x] Prohibit arbitrary public code and notebook execution.
- [x] Require explicit approval before any deployment.
- [x] Verify and record the primary public NWB dataset and CC BY 4.0 license.
- [x] Verify and record reviewed tool versions, licenses, and current Figurl
      support constraints.
- [x] Approve next-bin selected-unit rate prediction on 100 ms bins with
      contiguous chronological train/validation/test blocks.
- [x] Select the MIT project code license.

## Phase 1 — Audit and evidence gates

- [x] Audit local repositories for an existing NeuroStack implementation.
- [x] Confirm the project has no reusable local NWB/model/notebook artifacts.
- [x] Record the standalone repository boundary.
- [x] Audit DANDI and choose immutable Dandiset `000582@0.251111.2151`, asset
      `2b9e441b-56bc-4be2-893e-0e02d22d239d`.
- [x] Verify dataset license, DOI, exact path, metadata, access method, size, and
      SHA-256.
- [x] Audit first-party tool documentation, reviewed versions, and licenses.
- [x] Choose an accurately labeled internal Figurl-inspired Scientific Figure
      Viewer rather than official hosted Figurl.
- [x] Record baseline install, lint, tests, and build results.

## Phase 2 — Contracts, design system, and substantive route skeletons

- [x] Lock TypeScript scientific-data types to the JSON contracts in `schemas/`.
- [x] Add a Python 3.12 target environment and exact lightweight pipeline lock;
      clean Python 3.12 regeneration remains a release check.
- [x] Establish scientific typography, color, density, focus, and chart tokens.
- [ ] Implement substantive route shells for:
  - [x] `/`
  - [x] `/lab`
  - [x] `/pipeline`
  - [x] `/data`
  - [x] `/tools`
  - [x] `/tools/python`
  - [x] `/tools/jupyterlab`
  - [x] `/tools/pynapple`
  - [x] `/tools/nemos`
  - [x] `/tools/plenoptic`
  - [x] `/tools/stan`
  - [x] `/tools/bridgestan`
  - [x] `/tools/figurl`
  - [x] `/tools/pytorch`
  - [x] `/tools/scikit-learn`
  - [x] `/tools/plotly`
  - [x] `/tools/nwb`
  - [x] `/models`
  - [x] `/visualizations`
  - [x] `/notebooks`
  - [x] `/methods`
  - [x] `/sources`
  - [x] `/about`
  - [x] `/limitations`
- [x] Ensure every route has truthful content, mobile behavior, and an accessible
      non-visual explanation.

## Phase 3 — NWB ingestion and deterministic data pipeline

- [x] Pin and checksum the selected public NWB asset.
- [x] Validate the NWB structure and record source metadata findings.
- [x] Create and document the deterministic compact derivative.
- [x] Add a seeded synthetic fallback with a visibly different provenance label.
- [x] Validate selected units, time bases, finite values, and exclusions while
      preserving source caveats.
- [x] Produce schema-valid current web artifacts with accessible summaries.

## Phase 4 — Pynapple and Plotly lab

- [x] Represent spikes, intervals, behavioral variables, and metadata accurately.
- [x] Add raster, rate, tuning, occupancy, correlogram, and interval views only
      when supported by the selected data.
- [x] Link filters and brushing without changing provenance or units.
- [x] Provide summaries and table alternatives for every chart.

## Phase 5 — NeMoS and scikit-learn models

- [x] Freeze the shared scientific task and leakage-safe split.
- [x] Fit the NeMoS GLM and documented basis functions.
- [x] Fit a comparable scikit-learn baseline.
- [x] Report held-out metrics, uncertainty, diagnostics, and failure modes.
- [x] Export reproducible, schema-valid model artifacts.

## Phase 6 — PyTorch and Stan demonstrations

- [x] Implement a compact PyTorch comparison with deterministic training.
- [x] Record architecture, loss, optimizer, seed, epochs, and CPU/GPU truthfully.
- [x] Implement an actual Stan model for a declared uncertainty question.
- [x] Export diagnostics and posterior summaries with units and caveats.

## Phase 7 — plenoptic, BridgeStan, and scientific sharing

- [x] Generate reproducible plenoptic outputs from openly licensed nonmedical images.
- [x] Demonstrate BridgeStan log density and gradients using reviewed model code.
- [x] Implement and label the internal Figurl-inspired Scientific Figure Viewer
      without implying it is an official hosted Figurl instance.
- [x] Make shared views stable, read-only, and free of sensitive state.

## Phase 8 — Notebook and reproducibility record

- [x] Add `notebooks/neurostack_explorer.ipynb` as an executable artifact-
      verification narrative.
- [x] Execute it top-to-bottom and fail on cell errors; clean Python 3.12
      regeneration remains a release gate.
- [x] Sanitize outputs and render a read-only accessible preview.
- [x] Record package versions, commands, seeds, checksums, and expected runtime.

## Phase 9 — Accessibility, performance, and QA

- [ ] Run keyboard and screen-reader-oriented review.
- [x] Verify chart summaries, tables, units, and color-independent encodings.
- [ ] Verify reduced motion, no-JavaScript, and unavailable-Canvas/WebGL states.
- [x] Test 320, 390, 430, 768, 1024, 1280, and 1440 CSS-pixel layouts.
- [ ] Profile initial JavaScript, lazy modules, artifacts, and layout stability.
- [x] Run unit, pipeline, notebook, schema, link, browser, build, privacy, license,
      and secret checks.

## Phase 10 — Final evidence audit

- [x] Reconcile every public result to an artifact and source record.
- [x] Reconcile every source and software citation.
- [x] Remove unexplained placeholders and TODOs.
- [x] Capture final desktop and mobile evidence.
- [x] Write the completion report with exact commands and remaining limitations.
- [x] Confirm deployment readiness without deploying.
- [ ] Obtain explicit owner approval before deployment.
