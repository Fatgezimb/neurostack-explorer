# Repository instructions for Codex and other agents

## Project boundary

NeuroStack Explorer is a standalone personal scientific and technical portfolio
project. Do not describe it as a laboratory, clinical product, diagnostic tool,
published study, institutional platform, or evidence of clinical efficacy. Do
not imply that Fatgezim Bela created the demonstrated open-source libraries.

This repository must remain separate from the main résumé portfolio. The main
portfolio may link to a verified NeuroStack release later; do not copy its
hosting project identifier or deployment credentials here.

## Evidence before claims

- Select only a public NWB dataset with a stable identifier, verified license,
  documented metadata, manageable asset strategy, and no identifiable or
  private participant data.
- Record dataset title, authors, repository, identifier, license, species, brain
  region, modality, units/channels, behavioral variables, exact asset/session,
  transformations, checksum, and access date before presenting real-data output.
- Record official software source URLs and exact installed versions or commits.
- Never invent metrics, findings, model performance, biological interpretation,
  affiliations, publications, or dataset facts.
- Mark each result as computed, cached, synthetic, illustrative, or derived from
  public data. Do not use “real” as a substitute for provenance.
- When evidence conflicts, stop the affected claim, record the conflict, and
  keep the public field pending.

## Architecture constraints

- Prefer a static or hybrid artifact architecture: Python generates expensive
  scientific outputs offline; the TypeScript site reads validated artifacts.
- Do not run arbitrary visitor-supplied Python, shell commands, Stan code, or
  notebooks.
- Do not expose a general-purpose notebook execution environment.
- Do not accept untrusted NWB uploads without a separately reviewed ingestion,
  isolation, resource-limit, and deletion design.
- Do not add a backend, database, authentication, paid API, analytics platform,
  or deployment service unless the product requirement and owner approval are
  explicit.
- Keep large public source files outside Git. Use a deterministic compact
  derivative and retain the script and checksums that produced it. Use Git LFS
  only after an explicit repository decision.
- Synthetic fallback data must be deterministic, small, and visibly labeled.

## Scientific method constraints

- Use one coherent neuroscience task where the data supports it. NeMoS,
  scikit-learn, and PyTorch comparisons must share a declared target and a
  leakage-safe split.
- Fit preprocessing only on training data. Split by the scientifically relevant
  boundary (for example time block, trial, session, or subject), not by rows
  indiscriminately.
- Keep the Stan uncertainty analysis connected to a declared scientific
  quantity. Treat BridgeStan as an interface demonstration, not the primary
  scientific model.
- Keep plenoptic as a truthful visual-model demonstration; do not force a false
  biological connection to the NWB task.
- Set and record deterministic seeds where supported. Never silently regenerate
  changing outputs.
- Put units, sample definitions, inclusion rules, uncertainty, and limitations
  beside every scientific result.

## Accessibility and interface requirements

- Build mobile-first with semantic HTML, visible focus, logical headings, and
  keyboard access.
- Respect `prefers-reduced-motion` and provide explicit controls.
- Every chart needs a purpose, title, units, textual summary, and accessible data
  alternative. Do not convey information through color alone.
- Canvas, WebGL, notebook, and dense-chart views are enhancements. Essential
  content must remain available as HTML without them.
- Avoid decorative cyberpunk treatments that reduce scientific legibility.

## Phase order

Follow [PLANS.md](./PLANS.md). Do not represent a later phase as complete while
its evidence or tests are pending. Dataset and tool audits may block only their
dependent work; use labeled synthetic artifacts for safe interface development.

No deployment is authorized by repository work alone. Deployment requires an
explicit owner instruction after the release gates in [DEPLOYMENT.md](./DEPLOYMENT.md)
pass.

## Verification

Discover actual commands before running them. At minimum, run applicable:

- schema and provenance validation;
- Python formatting, typing, unit, pipeline, and notebook-execution checks;
- frontend lint, TypeScript, unit, rendered-route, and production-build checks;
- keyboard, reduced-motion, responsive, contrast, chart-alternative, link, and
  no-JavaScript browser checks;
- license, secret, privacy, and generated-artifact integrity checks.

Never claim a check passed without current output. Preserve unrelated user work
and never deploy, commit, push, or change access policy without authorization.

