"use client";

import { useEffect, useState } from "react";
import styles from "./PipelineExplorer.module.css";

type Stage = {
  id: string;
  label: string;
  tool: string;
  input: string;
  operation: string;
  output: string;
  why: string;
  limitation: string;
  code: string;
  href: string;
  origin: "public-derived" | "open-image" | "illustrative";
};

const ephysStages: Stage[] = [
  { id: "nwb", label: "Public NWB", tool: "NWB + DANDI", input: "Immutable DANDI asset 000582 @ 0.251111.2151", operation: "Verify SHA-256, validate the NWB schema, and read public metadata", output: "Validated units, LED1 position, and recording support", why: "The source identity and license remain attached to every derivative.", limitation: "The source session timestamp is a placeholder and is never presented as an acquisition date.", code: "source = fetch_and_verify(asset_uuid, expected_sha256)", href: "/tools/nwb", origin: "public-derived" },
  { id: "python", label: "Python loading", tool: "Python + PyNWB", input: "Validated NWB file handle", operation: "Select one documented session and allowlisted fields", output: "Typed public-session arrays", why: "Centralized validation prevents silent shape, unit, and metadata drift.", limitation: "The browser never runs arbitrary Python or parses an unrestricted upload.", code: "session = read_public_session(source, allowlist=FIELDS)", href: "/tools/python", origin: "public-derived" },
  { id: "pynapple", label: "Neural time series", tool: "Pynapple", input: "Eight sorted units, position, and explicit time support", operation: "Represent spikes and behavior with explicit support and independently verify the 100 ms t1c1 count target", output: "Time-series objects and a verified count vector; descriptive artifact arrays remain separately identified", why: "Time support stays explicit instead of treating gaps as continuous data.", limitation: "Tuning and correlograms are descriptive; they do not establish mechanism or connectivity.", code: "verified_counts = spikes[\"t1c1\"].count(bin_size)", href: "/tools/pynapple", origin: "public-derived" },
  { id: "features", label: "Feature engineering", tool: "Python", input: "Aligned 100 ms position and spike-count support", operation: "Build current x/y, trailing-only speed, and current t1c1 count; fit scaling on training rows only", output: "5,999-row design matrix plus train [0,3600), validation [3600,4200), gap [4200,4500), and test [4500,5999)", why: "Every comparable model sees the same inputs and untouched final test block.", limitation: "Predictive speed is deliberately trailing-only; the descriptive tuning view separately uses centered finite differences.", code: "X, y, split = build_encoding_task(session, gap_seconds=30)", href: "/methods", origin: "public-derived" },
  { id: "nemos", label: "Interpretable GLM", tool: "NeMoS", input: "Four training-standardized features and next-bin t1c1 counts", operation: "Fit a ridge-regularized Poisson GLM with exponential inverse link; evaluate a separate six-configuration basis explorer without using it in the fit", output: "Four coefficients, intercept, held-out predictions, residuals, mean Poisson deviance, and a clearly isolated basis artifact", why: "The primary encoding model remains interpretable at the feature level.", limitation: "The basis explorer is computed but was not used to fit or score the raw-feature GLM; predictive association is not causal explanation.", code: "glm.fit(X_train_scaled, y_train)", href: "/tools/nemos", origin: "public-derived" },
  { id: "sklearn", label: "Linear baseline", tool: "scikit-learn", input: "The identical four features and frozen outer split", operation: "Select PoissonRegressor alpha 0.1 with three expanding-window folds inside training, then report outer validation and evaluate final test once", output: "Fold audit, intercept-only reference, coefficients, and 1,499 final-test predictions", why: "A simple model exposes whether nonlinear capacity is actually useful.", limitation: "The training-only fold search and one outer split do not estimate across-session uncertainty.", code: "PoissonRegressor(alpha=0.1).fit(X_train_scaled, y_train)", href: "/tools/scikit-learn", origin: "public-derived" },
  { id: "pytorch", label: "Small neural model", tool: "PyTorch", input: "The identical task, frozen split, and standardized features", operation: "Train three predeclared CPU architectures; use validation for candidate selection and early stopping", output: "Architecture comparison, selected-model checkpoints, and 1,499 final-test predictions", why: "Nonlinear capacity is evaluated without assuming that deeper means better.", limitation: "The selected regularized 4–8–1 model comes from one validation block; seeded runs are not guaranteed bit-identical across platforms.", code: "selected = min(candidates, key=validation_deviance)", href: "/tools/pytorch", origin: "public-derived" },
  { id: "stan", label: "Uncertainty lane", tool: "Stan", input: "Training-standardized next-bin task, explicit priors, and deterministically thinned training rows", operation: "Sample a Poisson-log model and record posterior summaries, diagnostics, posterior-mean predictions, and a seeded held-out posterior predictive check", output: "Coefficient credible intervals, sampler diagnostics, held-out predictions, predictive intervals, and aggregate count check", why: "Uncertainty is modeled explicitly rather than appended as decorative bands.", limitation: "The predictive check remains conditional on this model, priors, and one held-out session block; prior sensitivity is not included.", code: "fit = model.sample(data=data, seed=SEED)", href: "/tools/stan", origin: "public-derived" },
  { id: "figures", label: "Interactive outputs", tool: "Plotly + figure viewer", input: "Versioned chart arrays, summaries, and view-state contract", operation: "Render linked figures and serialize meaningful selections in the URL", output: "Responsive figures, accessible summaries, and persistent analysis links", why: "A shared view can be inspected without detaching it from source and method metadata.", limitation: "The internal viewer is Figurl-inspired and is not represented as an official Figurl deployment.", code: "figure = make_figure(artifact, view_state)", href: "/visualizations", origin: "public-derived" },
  { id: "notebook", label: "Executable record", tool: "JupyterLab", input: "Pinned environment, checksum-matched cached NWB, and committed analysis artifacts", operation: "Restart and run 15 sections: validate the source, build Pynapple objects, refit deterministic model lanes, inspect Stan, and render Plotly", output: "Executed notebook, reproduced model checks, figure output, execution manifest, and reproduction commands", why: "Narrative, code, assumptions, and outputs remain adjacent.", limitation: "The notebook does not download the source or rerun Stan sampling, BridgeStan compilation, or plenoptic synthesis; no unrestricted public kernel is exposed.", code: "python scripts/execute_notebook.py --verify", href: "/notebooks", origin: "public-derived" },
];

const visualStages: Stage[] = [
  { id: "open-image", label: "Open visual input", tool: "Procedural sample", input: "Deterministic nonmedical image with explicit reuse status", operation: "Generate or load a fixed source and normalize it for one visual model", output: "Versioned source tensor", why: "This branch is honest about using visual—not MEC electrophysiology—input.", limitation: "The image is not a human-subject stimulus and the demo is not a perceptual experiment.", code: "image = build_procedural_source(seed=SEED)", href: "/tools/plenoptic", origin: "open-image" },
  { id: "plenoptic", label: "Model-based synthesis", tool: "plenoptic + PyTorch", input: "Procedural source tensor and fixed evaluation-mode Gaussian visual model", operation: "Run deterministic Metamer optimization for 80 iterations and record loss checkpoints", output: "Final synthesized image, display-scaled difference, numeric pixel MSE, and representation-loss history", why: "The comparison reveals what the chosen model representation preserves.", limitation: "A metamer for one model is not evidence of equivalence for human perception.", code: "metamer = plenoptic.Metamer(image, model)", href: "/tools/plenoptic", origin: "open-image" },
  { id: "visual-share", label: "Share visual evidence", tool: "Plotly + notebook", input: "Synthesis checkpoints and model metadata", operation: "Package comparisons with captions, source status, and limitations", output: "Inspectable figure and reproducible notebook section", why: "The visual branch converges only at communication and reproducibility.", limitation: "Precomputed synthesis is labeled; the browser does not imply live optimization.", code: "export_visual_branch(checkpoints, manifest)", href: "/notebooks", origin: "open-image" },
];

const bridgeStage: Stage = {
  id: "bridgestan", label: "BridgeStan interface", tool: "BridgeStan", input: "A separate compiled two-parameter Stan model and unconstrained parameter vector", operation: "Evaluate log density and gradient and replay one deterministic optimizer step", output: "Checksummed surface grid, gradient vectors, and proposal trace", why: "It demonstrates the lower-level interface without pretending to be another biological estimator.", limitation: "Gradients are with respect to unconstrained parameters; propto and Jacobian settings are recorded.", code: "logp, grad = model.log_density_gradient(theta)", href: "/tools/bridgestan", origin: "illustrative",
};

const allStages = [...ephysStages, ...visualStages, bridgeStage];

export function PipelineExplorer() {
  const [selected, setSelected] = useState<Stage>(ephysStages[0]);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = window.requestAnimationFrame(() => setReducedMotion(media.matches));
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener("change", onChange);
    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    const timer = window.setInterval(() => {
      setSelected((current) => allStages[(allStages.findIndex((stage) => stage.id === current.id) + 1) % allStages.length]);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion]);

  return (
    <div className="page-shell">
      <header className="page-intro">
        <p className="eyebrow">Complete pipeline / two honest branches</p>
        <h1>Follow the evidence, not the logo order.</h1>
        <p>
          The public MEC recording supports the neural-analysis branch. plenoptic receives a separate visual input,
          and BridgeStan remains a lower-level interface demonstration. The branches converge at figures and the notebook.
        </p>
        <div className="button-row">
          <button aria-pressed={playing && !reducedMotion} className="button" disabled={reducedMotion} onClick={() => setPlaying((current) => !current)} type="button">{reducedMotion ? "Motion preference: manual stages" : playing ? "Pause stage sequence" : "Play stage sequence"}</button>
          <a className="button-secondary" href="/data">Inspect the source asset</a>
          <a className="button-quiet" href="/methods">Read the methods</a>
        </div>
      </header>

      <section aria-labelledby="ephys-branch-heading" className={styles.branch}>
        <div className={styles.branchHead}>
          <div><p className="eyebrow">Branch A · public ephys</p><h2 id="ephys-branch-heading">MEC position + spikes → neural encoding</h2></div>
          <span className="status-pill" data-tone="public">Public-derived · CC BY 4.0</span>
        </div>
        <ol className={styles.stageRail} data-playing={playing}>
          {ephysStages.map((stage, index) => (
            <li key={stage.id}>
              <button aria-pressed={selected.id === stage.id} onClick={() => { setSelected(stage); setPlaying(false); }} type="button">
                <span className="mono">{String(index + 1).padStart(2, "0")}</span>
                <strong>{stage.label}</strong><small>{stage.tool}</small>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="visual-branch-heading" className={styles.branch}>
        <div className={styles.branchHead}>
          <div><p className="eyebrow">Branch B · visual model</p><h2 id="visual-branch-heading">Open visual input → model-based synthesis</h2></div>
          <span className="status-pill" data-tone="precomputed">Separate precomputed branch</span>
        </div>
        <ol className={styles.stageRail} data-playing={playing}>
          {visualStages.map((stage, index) => (
            <li key={stage.id}>
              <button aria-pressed={selected.id === stage.id} onClick={() => { setSelected(stage); setPlaying(false); }} type="button">
                <span className="mono">B{index + 1}</span><strong>{stage.label}</strong><small>{stage.tool}</small>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <button
        aria-pressed={selected.id === bridgeStage.id}
        className={styles.bridgeButton}
        onClick={() => { setSelected(bridgeStage); setPlaying(false); }}
        type="button"
      >
        <span className="mono">SIDE INTERFACE</span><strong>BridgeStan log-density + gradient explorer</strong><small>Not a sequential estimator stage</small>
      </button>

      <section aria-live="polite" className={styles.inspector}>
        <div className={styles.inspectorTitle}>
          <div><p className="eyebrow">Selected stage / {selected.tool}</p><h2>{selected.label}</h2></div>
          <span className="status-pill" data-tone={selected.origin === "public-derived" ? "public" : selected.origin === "open-image" ? "precomputed" : "synthetic"}>{selected.origin}</span>
        </div>
        <div className={styles.contractGrid}>
          <article><h3>What enters</h3><p>{selected.input}</p></article>
          <article><h3>What happens</h3><p>{selected.operation}</p></article>
          <article><h3>What exits</h3><p>{selected.output}</p></article>
        </div>
        <div className={styles.detailGrid}>
          <article><h3>Why it matters</h3><p>{selected.why}</p></article>
          <article><h3>Limitation</h3><p>{selected.limitation}</p></article>
        </div>
        <pre aria-label="Selected stage code excerpt" tabIndex={0}><code>{selected.code}</code></pre>
        <div className="button-row"><a className="button-secondary" href={selected.href}>Open this module</a><a className="button-quiet" href="/sources">Official sources</a></div>
      </section>
    </div>
  );
}
