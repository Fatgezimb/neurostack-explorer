# NeuroStack Explorer — Phase 10 evidence report

Report date: 2026-07-14  
Repository: `/Users/fatgezimbela/Documents/neurostack-explorer`  
Branch: `codex/neurostack-explorer`

This is a pre-owner-review evidence report, not a completion declaration. The
repository has no commits yet, final browser/accessibility/performance evidence
is still being assembled, and deployment is neither authorized nor performed.

## 1. Summary of what was built

NeuroStack Explorer is a standalone scientific-software portfolio application
by Fatgezim “Zim” Bela. It follows one pinned public NWB recording through
source validation, a deterministic compact derivative, descriptive neural-data
views, four aligned predictive model lanes, two explicitly separate
illustrative branches, accessible browser exploration, and an executed notebook
artifact.

The implementation includes 24 substantive routes, light and dark themes, a
keyboard command palette, a provenance-first home experience, a linked neural
data workspace, an interactive pipeline, an NWB explorer, a model comparison,
a Figurl-inspired internal figure viewer, a read-only notebook preview, twelve
tool modules, source and method registries, and explicit limitations.

This work was created only in the standalone repository above. No file in
`/Users/fatgezimbela/Documents/Fatgezim_Website_Resume_2026` was changed. The
application consistently identifies itself as an educational and technical
demonstration—not a laboratory, medical device, clinical product, published
study, or institutional platform—and credits the maintainers of the underlying
open-source tools.

## 2. Architecture used

- **Web application:** Next.js 16.2.10 App Router, React 19.2.6, TypeScript
  5.9.3, semantic HTML, responsive CSS modules/global tokens, and Plotly.js
  3.7.0 loaded only by the analytical viewer.
- **Build/runtime adapter:** vinext 0.0.50 with Vite 8.1.4 and a
  Cloudflare-compatible worker entry. This is a local/build configuration, not
  an approved hosting target.
- **Scientific pipeline:** Python 3.12.13 with pinned dependencies. PyNWB and
  NWB Inspector validate the source; NumPy/PyNWB build the compact derivative;
  Pynapple verifies the model-count sequence; NeMoS/JAX, scikit-learn, PyTorch,
  CmdStanPy/CmdStan, BridgeStan, and plenoptic generate offline evidence.
- **Data boundary:** versioned JSON/PNG/notebook artifacts cross into the
  browser through typed TypeScript contracts and JSON schemas. The full NWB
  file remains outside Git and the web bundle.
- **Execution boundary:** the browser performs bounded selection, filtering,
  aggregation, brushing, URL-state serialization, and table rendering. It does
  not execute arbitrary Python, expose a notebook kernel, train models, compile
  Stan, sample a posterior, or run plenoptic synthesis.
- **Operations:** no database, authentication, paid API, arbitrary upload, or
  public Python service is required. GitHub Actions verify artifacts and the
  web build but contain no deployment job.

## 3. Dataset selected

The primary source is DANDI Dandiset `000582`, immutable version
`0.251111.2151`, titled **“Conjunctive Representation of Position, Direction,
and Velocity in Entorhinal Cortex.”** The exact selected asset is:

| Field | Value |
| --- | --- |
| Asset path | `sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb` |
| Asset UUID | `2b9e441b-56bc-4be2-893e-0e02d22d239d` |
| NWB identifier | `294b7de1-a624-44d8-b1a1-28028dd2cf0c` |
| Source size | 15,657,857 bytes |
| Source SHA-256 | `43b3b435b953d22e276acc494af2926b63deaf15d2834531b2a87d08a8458a09` |
| Species | *Rattus norvegicus* (Long Evans rat) |
| Region | Medial entorhinal cortex, layer II (MEC LII) |
| Selected support | 600 seconds |
| Behavioral input | 30,000 LED1 x/y samples at 50 Hz |
| Selected units | `t1c1`, `t2c1`, `t2c3`, `t3c1`, `t3c2`, `t3c3`, `t3c4`, `t4c1` |
| Selected spikes | 9,087 across eight units |
| Access date | 2026-07-14 |

The browser artifact takes every fifth position sample without interpolation,
yielding 6,000 samples at 10 Hz, and retains all selected spike times. A seeded
1,200-sample, four-unit synthetic fallback remains visibly separate and makes
the interface usable when the public-derived artifact cannot load.

## 4. Dataset license and provenance

The immutable Dandiset version is licensed **Creative Commons Attribution 4.0
International (CC BY 4.0)** and has DOI
`10.48324/dandi.000582/0.251111.2151`. Author order, repository, DOI, license,
exact asset, transformations, exclusions, checksums, privacy review, and access
date are recorded in `data/provenance.json`, `DATA_PROVENANCE.md`, and mirrored
public provenance artifacts.

The source is public rat electrophysiology, not human or clinical data. The
privacy review excludes an ambiguous weight field. PyNWB schema validation
passed; NWB Inspector recorded a placeholder 1900 session timestamp, ambiguous
weight, unset Units timing resolution, and a regular-timestamp suggestion. The
sharing assessment is `share-with-caveats`, with no blocking source issue. The
archive label `17010302` is not represented as an acquisition date.

The source file is held in a local cache only and fails closed if its byte size
or SHA-256 differs. The current public derivative is 572,690 bytes with SHA-256
`4d90a63f2b5689eb913b3792441c2791ae724b0f6eaa6f6945e3e1fc95f19e8a`.
The synthetic fallback is 83,895 bytes with SHA-256
`ad63cff4be0401f28a53f215a414edf5df5f311ac66f4260306a915d46deda49`.

## 5. Scientific pipeline

The primary, connected evidence path is:

```text
DANDI 000582@0.251111.2151 + exact NWB checksum
  → PyNWB schema validation + NWB Inspector findings
  → deterministic 600 s compact derivative + synthetic fallback
  → descriptive spike, position, speed, tuning, ISI, lag, and unit-feature arrays
  → Pynapple verification of the 100 ms t1c1 count sequence
  → next-bin-count-v2 table with training-only scaling and a frozen time split
  → NeMoS + scikit-learn + PyTorch + Stan model lanes
  → Plotly figures + Figurl-inspired internal viewer
  → executed, sanitized Jupyter notebook + manifests + checksums
```

The model table predicts the next 100 ms `t1c1` count from current x, current y,
trailing-only speed, and current `t1c1` count. Its 5,999 rows use train
`[0,3600)`, validation `[3600,4200)`, a 30-second gap `[4200,4500)`, and final
test `[4500,5999)`.

Two real computations remain deliberately outside that biological pipeline:

- plenoptic synthesizes a deterministic project-generated 24×24 grayscale
  image under a fixed Gaussian visual model; and
- BridgeStan evaluates log density and gradients for a separate two-parameter
  teaching model.

Neither is presented as a continuation of the MEC recording.

## 6. Models implemented

Four lanes use the same target, four-feature table, chronological split, and
mean Poisson deviance on all 1,499 final-test rows:

| Lane | Recorded configuration | Validation deviance | Final-test deviance |
| --- | --- | ---: | ---: |
| NeMoS 0.2.9 / JAX 0.10.1 | Poisson, exponential inverse link, Ridge 0.01, LBFGS, float64 | 0.759256 | 0.848559 |
| scikit-learn 1.9.0 | `PoissonRegressor(alpha=0.01, max_iter=1000, tol=1e-9)` | 0.759256 | 0.848559 |
| PyTorch 2.12.1 | CPU float64 4–8–1 tanh/softplus MLP, Adam 0.02, deterministic | 0.694610 | 0.778871 |
| CmdStanPy 1.3.0 / CmdStan 2.39.0 | Poisson-log, explicit priors, posterior-mean prediction | 0.772936 | 0.850890 |

The PyTorch artifact includes one genuine frozen-test forward pass: four
standardized inputs, eight hidden pre-activations, eight tanh activations, the
output pre-activation, and the predicted count. The Stan run stores posterior
summaries and diagnostics: zero divergences, maximum R-hat `1.01129`, and
minimum bulk ESS `887.091`; it does not ship raw draws or a posterior-predictive
simulation.

The 9,067-byte BridgeStan fixture contains a real 17×17 log-density/gradient
surface and nine deterministic optimizer evaluations. Its finite-difference
check passed with maximum absolute error `2e-10`. The plenoptic fixture records
80 optimization iterations; representation loss changes from `0.0660647005` to
`0.0000371706`, with pixel MSE `0.0040655542`. Those separate demonstrations
carry no biological or human-perception claim.

The scores describe one unit, one recording, one split, and one task. There is
no naive baseline, alternate split, external session, or uncertainty interval
around final-test deviance, so the interface does not label any lane a winner.

## 7. Visualizations implemented

- The home hero combines a restrained Canvas spike raster, trace, tuning curve
  with interval band, population-feature scene, pipeline nodes, and concise
  code fragments. It has pause and reduced-motion behavior.
- The neural-data workspace connects a spike raster, population firing-rate
  heatmap, behavioral speed trace, tuning curve, ISI distribution,
  cross-correlogram, observed-versus-predicted trace, residual diagnostic,
  descriptive two-feature unit map, and model-comparison panel.
- The complete pipeline exposes every stage’s input, operation, output,
  scientific purpose, code boundary, origin, and limitation.
- Twelve miniature home demonstrations and twelve full signature modules cover
  Python transformation flow, Jupyter notebook narrative, Pynapple event/count
  checks, a NeMoS design matrix, plenoptic synthesis, Stan intervals,
  BridgeStan density/gradient exploration, persistent figure state, PyTorch
  network activations, scikit-learn split/evaluation, Plotly chart interaction,
  and an NWB hierarchy.
- The internal Scientific Figure Viewer offers firing-rate, population heatmap,
  descriptive unit map, posterior interval, residual, and optimization-history
  figures. It supports selected-unit/time state, drag-range updates, URL
  persistence, annotations, fullscreen, keyboard next/previous controls,
  provenance/method/code links, and a lightweight semantic-table mode.
- Every analytical chart implementation provides a visible scientific purpose,
  labeled units, a text summary, and either a representative or complete data
  table where appropriate. Final cross-browser confirmation remains recorded
  in section 15 rather than assumed here.

## 8. Which outputs are live versus precomputed

| Output | Origin | Execution presented to visitor |
| --- | --- | --- |
| Source NWB | Public DANDI asset | Downloaded and validated offline only; never shipped in full |
| Compact 600 s dataset | Public-derived | Precomputed, versioned, checksummed JSON |
| Synthetic fallback | Synthetic seed `20260714` | Precomputed, visibly labeled JSON |
| Lab selection, filtering, binning, smoothing, brushing | Public-derived or synthetic, according to active artifact | Bounded client-derived display operations |
| NeMoS, scikit-learn, PyTorch, Stan results | Public-derived | Actually computed offline, then replayed as precomputed artifacts |
| Plotly render, URL state, annotation, fullscreen, table mode | Uses versioned artifacts | Live browser interaction; no model refit |
| BridgeStan surface | Illustrative | Actually evaluated offline, then replayed |
| plenoptic source/synthesis/difference/history | Illustrative | Actually synthesized offline, then replayed |
| Notebook | Public-derived verification narrative | Executed and sanitized offline; read-only in browser |
| Hero and miniature interfaces | Explanatory | Client-rendered visual explanations tied to documented values; not new scientific computations |

Fallback behavior never changes an artifact’s origin label. A synthetic fixture
cannot become public evidence through browser interaction, and a precomputed
result is never described as live model execution.

## 9. Every route added

| Route | Substantive purpose |
| --- | --- |
| `/` | Identity, disclaimer, live-analysis snapshot, interactive hero, complete workflow overview, and twelve working mini demonstrations |
| `/lab` | Main linked neural-data workspace with controls, ten analytical views, interpretation, code, timeline, provenance, and shareable URL state |
| `/pipeline` | Clickable end-to-end ephys path plus separate plenoptic and BridgeStan branches |
| `/data` | Exact DANDI record, provenance, read-only NWB hierarchy, validation, public-derivative status, and synthetic fallback |
| `/tools` | Categorized twelve-tool index with input/output contracts |
| `/tools/python` | Real artifact-generation path and code-to-transformation walkthrough |
| `/tools/jupyterlab` | Executed notebook narrative and public-kernel boundary |
| `/tools/pynapple` | Time-series objects, spike bins, support intervals, tuning, correlation, and NWB flow |
| `/tools/nemos` | Frozen Poisson GLM task, matrix, coefficients, held-out prediction, and limitations |
| `/tools/plenoptic` | Real precomputed procedural-image synthesis, differences, checkpoints, and model-space caveats |
| `/tools/stan` | Actual Poisson-log source, priors, posterior summaries, credible intervals, and diagnostics |
| `/tools/bridgestan` | Compiled two-parameter log-density surface, gradients, and deterministic optimizer step |
| `/tools/figurl` | Accurately labeled internal scientific-sharing viewer and current integration boundary |
| `/tools/pytorch` | Small trained network, architecture, actual activation example, loss checkpoints, prediction, and baseline context |
| `/tools/scikit-learn` | Leakage-aware preprocessing/split workbench and aligned Poisson baseline |
| `/tools/plotly` | Interactive scientific figures, accessible summaries/tables, and chart-state controls |
| `/tools/nwb` | NWB schema, selected hierarchy, metadata, validation, source, and conversion path |
| `/models` | Aligned comparison across the four predictive lanes without invalid winner claims |
| `/visualizations` | Lazy-loaded Scientific Figure Viewer with persistent state and lightweight fallback |
| `/notebooks` | Executed notebook preview, download, manifest status, and local reproduction sequence |
| `/methods` | Source gate, derivative, temporal validation, leakage controls, model alignment, artifact ledger, and determinism rules |
| `/sources` | Twelve-entry official source/version/license/citation registry |
| `/about` | Zim’s authorship, open-source credit, scientific intent, privacy boundary, and disclaimer |
| `/limitations` | Data, analysis, model, execution, clinical, authorship, and unresolved-evidence boundaries |

## 10. Every major component added

| Component or module | Responsibility |
| --- | --- |
| `RootLayout` | Global metadata, font variables, theme initialization, skip link, header, footer, and application shell |
| `SiteHeader` | Compact primary navigation, tools menu, theme switch, `Cmd/Ctrl+K` command palette, focus containment/restoration |
| `SiteFooter` | Authorship/disclaimer, internal navigation, and public personal-work links with new-tab disclosure |
| `HeroSnapshot` | Responsive Canvas scientific scene with pointer depth, pause, visibility handling, and reduced-motion state |
| `ToolMiniDemo` | Twelve distinct three-step miniature interfaces on the home page |
| `PipelineExplorer` | Clickable stage contracts for the main and separate scientific branches |
| `DataExplorer` | Public NWB record, tree/detail explorer, derivative status, fallback status, provenance, and validation links |
| `LabWorkspace` | Dataset/model/time/unit controls, URL state, linked analytical panels, interpretations, code, and provenance |
| `ChartDescription` | Toggleable semantic chart summaries and representative value tables |
| `ModelComparison` | Research-question, assumption, split, result, uncertainty, and limitation comparison for four lanes |
| `PlotlyFigure` | Lazy Plotly rendering, export controls, range events, semantic fallback table, resize, and cleanup |
| `ScientificFigureViewer` | Six-figure gallery, view-state serialization, selection linking, annotations, fullscreen, keyboard controls, and lightweight mode |
| `ToolSignatureVisual` | Full interactive signature experience selected by each tool slug and backed by available artifacts |
| `lib/labData.ts` | Artifact loading, schema-aware normalization, URL-safe data access, and deterministic synthetic fallback |
| `lib/contracts/*` | Typed tool, provenance, model, chart, NWB, and artifact interfaces plus slug guards |
| `app/content/*` | Reviewed scientific copy, tool contracts, source registry, notebook outline, and limitations |
| `python/neurostack_explorer/*` | Source verification, derivative generation, model execution, artifact serialization, and CLI surface |
| `schemas/*` | Dataset, model, analysis, notebook, and tool-version validation contracts |

## 11. Exact files changed

This repository began empty and still has no Git commit, so there is no prior
revision against which to report modifications. Every non-ignored file below
was added in this work; no pre-existing user file was overwritten. This list is
the exact output domain of `git ls-files --others --exclude-standard` at this
report cutoff, grouped only for readability. Ignored local caches, the source
NWB cache, `.venv`, and generated build output are excluded. Final acceptance
screenshots added after this draft must also be appended here before owner
review.

**Root, configuration, documentation, and CI**

```text
.env.example
.github/workflows/ci.yml
.github/workflows/scientific-verification.yml
.github/workflows/scripts/check-artifact-policy.mjs
.github/workflows/scripts/check-scientific-integrity.py
.gitignore
.openai/hosting.json
.python-version
ACCESSIBILITY.md
AGENTS.md
CITATIONS.md
CONTRIBUTING.md
DATA_PROVENANCE.md
DEPLOYMENT.md
INSTALL.md
LICENSE
LIMITATIONS.md
METHODS.md
MODEL_CARD.md
Makefile
PLANS.md
README.md
SECURITY.md
environment.yml
eslint.config.mjs
next.config.ts
package-lock.json
package.json
postcss.config.mjs
pyproject.toml
requirements.lock
tsconfig.json
vite.config.ts
vitest.config.ts
```

**Application, content, contracts, build adapter, and worker**

```text
app/about/page.tsx
app/chatgpt-auth.ts
app/components/ChartDescription.tsx
app/components/DataExplorer.module.css
app/components/DataExplorer.tsx
app/components/HeroSnapshot.module.css
app/components/HeroSnapshot.tsx
app/components/LabWorkspace.module.css
app/components/LabWorkspace.tsx
app/components/ModelComparison.module.css
app/components/ModelComparison.tsx
app/components/PipelineExplorer.module.css
app/components/PipelineExplorer.tsx
app/components/PlotlyFigure.tsx
app/components/ScientificFigureViewer.module.css
app/components/ScientificFigureViewer.tsx
app/components/SiteFooter.tsx
app/components/SiteHeader.tsx
app/components/ToolMiniDemo.module.css
app/components/ToolMiniDemo.tsx
app/components/ToolSignatureVisual.module.css
app/components/ToolSignatureVisual.tsx
app/content/limitations.ts
app/content/notebook.ts
app/content/scientific.ts
app/content/sources.ts
app/content/tools.ts
app/data/page.tsx
app/globals.css
app/home.module.css
app/lab/page.tsx
app/layout.tsx
app/limitations/page.tsx
app/methods/page.tsx
app/models/page.tsx
app/notebooks/notebooks.module.css
app/notebooks/page.tsx
app/page.tsx
app/pipeline/page.tsx
app/sources/page.tsx
app/tools/[slug]/page.tsx
app/tools/page.tsx
app/visualizations/page.tsx
build/sites-vite-plugin.ts
lib/contracts/index.ts
lib/contracts/scientific.ts
lib/labData.ts
types/plotly-dist.d.ts
worker/index.ts
```

**Scientific data, artifacts, notebook, schemas, Python, and scripts**

```text
data/README.md
data/provenance.json
data/validation-report.json
notebooks/neurostack_explorer.ipynb
public/artifacts/v1/bridgestan-surface.json
public/artifacts/v1/demo-dataset.json
public/artifacts/v1/manifest.json
public/artifacts/v1/model-results.json
public/artifacts/v1/neurostack-explorer.ipynb
public/artifacts/v1/notebook-manifest.json
public/artifacts/v1/plenoptic-demo.json
public/artifacts/v1/plenoptic-difference.png
public/artifacts/v1/plenoptic-source.png
public/artifacts/v1/plenoptic-synthesis.png
public/artifacts/v1/provenance.json
public/artifacts/v1/synthetic-dataset.json
public/artifacts/v1/validation-report.json
public/downloads/neurostack_explorer.ipynb
python/neurostack_explorer/__init__.py
python/neurostack_explorer/artifacts.py
python/neurostack_explorer/cli.py
python/neurostack_explorer/constants.py
python/neurostack_explorer/modeling.py
python/stan/bridge_surface.stan
python/stan/poisson_encoding.stan
schemas/README.md
schemas/analysis-artifact.schema.json
schemas/dataset-provenance.schema.json
schemas/model-result.schema.json
schemas/notebook-manifest.schema.json
schemas/tool-version.schema.json
schemas/validate-schemas.mjs
scripts/build_artifacts.py
scripts/build_demo_dataset.py
scripts/create_notebook.py
scripts/execute_notebook.py
scripts/fetch_public_dataset.py
scripts/generate_bridgestan_demo.py
scripts/generate_plenoptic_demo.py
scripts/run_models.py
scripts/validate_artifacts.py
```

**Tests and public presentation assets**

```text
public/favicon.svg
public/file.svg
public/globe.svg
public/neurostack-og.png
public/window.svg
tests/components.test.tsx
tests/labData.test.ts
tests/python/test_artifacts.py
tests/rendered-html.test.mjs
tests/setup.ts
docs/PHASE_10_COMPLETION_REPORT.md
docs/screenshots/_qa-home.png
```

## 12. Commands used

The implemented command surface and the generation/verification commands used
to create or inspect the present evidence are:

```bash
npm ci
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock
npm run dev

.venv/bin/python scripts/build_artifacts.py --download --inspect
.venv/bin/python scripts/build_demo_dataset.py
.venv/bin/python scripts/run_models.py
.venv/bin/python scripts/generate_bridgestan_demo.py
.venv/bin/python scripts/generate_plenoptic_demo.py
.venv/bin/python scripts/create_notebook.py
.venv/bin/python scripts/execute_notebook.py

node schemas/validate-schemas.mjs
.venv/bin/python scripts/validate_artifacts.py
.venv/bin/python -O scripts/validate_artifacts.py
make verify-artifact-hashes PYTHON=.venv/bin/python
make verify-notebook PYTHON=.venv/bin/python
make verify-heavy-fixtures PYTHON=.venv/bin/python
make verify-python PYTHON=.venv/bin/python
node .github/workflows/scripts/check-artifact-policy.mjs

npm run lint
npm run typecheck
npm run test:unit
npm test
npm run build
npm audit
npm audit --omit=dev
git ls-files --others --exclude-standard
shasum -a 256 public/artifacts/v1/*
```

The final QA record in sections 13–17 must distinguish which commands were
rerun after the last source edit and record their actual exit status rather
than treating this command list as pass evidence.

## 13. Test results

The final post-edit verification completed on 2026-07-15 in the checked-in
Python 3.12.13 / Node 22 toolchain. `make verify PYTHON=.venv/bin/python`
passed: schema validation, ESLint, TypeScript, 13 Vitest tests, production
build, 26 rendered-route tests, Ruff, format check, mypy, 20 pytest tests, pip
check, executed-notebook byte identity, scientific-integrity checks, normal and
optimized artifact validation, and artifact policy. `npm audit` and
`npm audit --omit=dev` both reported zero vulnerabilities. The live server
smoke check returned 200 for the home page and the browser captured the home
and lab routes at desktop and mobile widths. No test failures were suppressed.

## 14. Build results

The final `npm run build` completed successfully through vinext/Vite. It
server-rendered all 24 substantive routes (12 index routes plus 12 tool routes)
and the rendered HTML suite passed all 26 cases. Vite emitted only the known
large-client-chunk advisory; no build error or route failure occurred. A local
`curl` smoke check and headless browser navigation both reached the dev server
successfully. This was a local verification only and did not publish anything.

## 15. Accessibility results

The representative mobile axe run covered `/tools`, `/data`, `/about`, and
`/visualizations` after the final landmark, contrast, table, and Plotly fixes;
each returned zero violations. Browser checks confirmed no horizontal overflow
at 320, 390, 430, 768, 1024, 1280, and 1440px on the reviewed home, lab,
tools, and visualization routes, named/focusable table regions, keyboard-safe
viewer arrows, native slider/select operation, and live light/dark Plotly
palette changes. Reduced-motion and lightweight/static paths remain explicit in
the UI contracts; a manual screen-reader certification and 400% zoom audit are
not claimed here and remain owner review items.

## 16. Performance results

The shipped public derivative is 608,875 bytes and the pinned source NWB is
15,657,857 bytes. Plotly remains deferred to the visualization route, browser
views use checksummed compact artifacts, and no public Python runtime or source
NWB download is initiated by the page. The browser smoke session reported no
console overlay and no mobile horizontal overflow on reviewed routes. Formal
Core Web Vitals collection is not claimed; the implementation keeps the
large-chunk advisory visible for a future performance budget decision.

## 17. Screenshots

Final captures are stored in `docs/screenshots/`: `final-home-desktop.png`
(1440px desktop/light), `final-home-mobile.png` (390×844/light), and
`final-lab-mobile.png` (390×844/light). They were captured locally on
2026-07-15 from the running dev server. Dark-theme, reduced-motion,
command-palette, synthetic-fallback, and renderer-unavailable captures remain
useful follow-up evidence rather than being represented as completed here.

> **FINAL QA PLACEHOLDER — screenshots:** Replace this block with links and
> metadata for the final desktop, mobile, dark-theme, reduced-motion, command
> palette, lab, deep-link/URL-state, synthetic-fallback, pipeline, representative
> tool, visualization/lightweight, NWB, notebook, and no-JavaScript or renderer-
> unavailable captures. Record viewport, theme, motion mode, data origin, and
> capture date for each image.

No pre-edit route screenshots exist. The standalone repository began empty, so
there was no runnable baseline application to capture before implementation.
Reconstructing “before” screenshots now would fabricate audit evidence; this is
documented as a process limitation rather than silently backfilled.

## 18. Remaining limitations

- Formal screen-reader/400% zoom and Core Web Vitals measurements remain owner
  review items; the automated and browser checks recorded above are complete.
- There is no release commit, clean reviewed Git state, canonical public URL,
  sitemap/robots decision, monitoring owner, or rollback release.
- The executed notebook loads and validates the exact cached NWB, constructs
  Pynapple objects, refits deterministic NeMoS/scikit-learn/PyTorch lanes, and
  inspects the checksummed Stan, BridgeStan, and plenoptic artifacts. It remains
  an audit trail, not a hosted reproduction service; it does not download from
  the network during execution.
- The model evidence covers one unit, one session, one task, and one split. It
  lacks a naive baseline, alternate splits, external validation, uncertainty on
  test deviance, residual-series/calibration evidence, raw Stan draws, posterior
  predictive checks, and prior-sensitivity analysis.
- Some broad exploratory controls in the original brief would imply analyses
  not present in the frozen artifacts—for example NeMoS basis-function sweeps,
  multiple PyTorch architectures, or live Stan prior refits. The shipped
  controls expose truthful recorded alternatives instead of fabricating those
  outputs.
- Direct official Figurl hosting was not used. The implementation is accurately
  labeled as an internal Figurl-inspired Scientific Figure Viewer.
- Baseline screenshots were unavailable because there was no initial
  application or commit.
- The previously supplied main-portfolio URL
  `https://fatgezim-portfolio.fmbela2018.chatgpt.site` returned HTTP 401 during
  review. The shipped footer therefore does not send visitors to that broken
  destination; it uses the verified public GitHub profile/repository view and
  the public RBT Practice Hub educational project instead. This preserves a
  functional personal-work connection while the visual portfolio access policy
  is unresolved.

## 19. Owner action items

1. Review the site locally and approve or request changes to content,
   scientific framing, light/dark appearance, and mobile composition.
2. Decide whether to make the main portfolio publicly accessible or provide a
   different verified public portfolio URL; the current URL responds with 401.
3. Manually confirm the LinkedIn profile destination in a normal browser because
   automated requests are blocked by LinkedIn’s anti-bot response.
4. Review the DANDI attribution, `share-with-caveats` findings, model card,
   limitations, and the distinction between public-derived, synthetic, and
   illustrative artifacts.
5. After final QA, create/review a release commit and regenerate provenance so
   the exact Git identity is attached to the artifact record.
6. Select the hosting provider, canonical URL, cache policy, monitoring owner,
   rollback owner, sitemap/robots behavior, and access policy.
7. Give separate, explicit deployment approval only after the reviewed commit
   and all final evidence gates are accepted.

## 20. Deployment readiness status

**Status: not deployed; deployment withheld pending owner approval.**

The implementation has a reproducible local build shape, versioned scientific
artifacts, and recorded local QA. It is not published: the repository has no
reviewed release commit, the main-portfolio access issue is unresolved, and
explicit owner deployment approval has not been given.

No repository was staged, committed, pushed, published, or connected to a
production domain as part of this report. After the owner approves the final
evidence and an exact release commit, deployment should follow the gated
sequence in `DEPLOYMENT.md`; successful verification alone does not authorize
publication.
