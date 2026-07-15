"use client";

import { useEffect, useMemo, useState } from "react";
import type { DemoDataset } from "../../lib/labData";
import { createSyntheticFallback, loadDemoDataset } from "../../lib/labData";
import { TableScroll } from "./TableScroll";
import styles from "./ModelComparison.module.css";

type ModelKey = "nemos" | "sklearn" | "pytorch" | "stan";

const descriptions = {
  nemos: { research: "How well do current x/y, trailing-only speed, and current t1c1 count predict t1c1 in the next 100 ms bin?", inputs: "Four frozen, training-standardized features", assumptions: "Poisson count likelihood; exponential inverse link; ridge penalty; no basis expansion in the fitted lane", strengths: "Interpretable fitted coefficients plus a separate computed basis explorer", limits: "Linear-in-feature fit; the basis explorer was not used to fit or score it; count assumptions may miss dispersion", time: "Offline CPU artifact generation", uncertainty: "No full posterior", use: "Primary neural encoding model" },
  sklearn: { research: "What does a leakage-aware linear count baseline achieve on the same frozen task?", inputs: "The identical four-feature table", assumptions: "PoissonRegressor; alpha chosen by three expanding-window folds contained inside training; fold-local preprocessing", strengths: "Auditable cross-validation and an intercept-only reference", limits: "Limited nonlinear capacity; one predeclared alpha grid and one recording", time: "Offline CPU artifact generation", uncertainty: "No parameter or predictive uncertainty", use: "Baseline and leakage check" },
  pytorch: { research: "Does limited nonlinear capacity improve held-out count prediction without unstable overfitting?", inputs: "The identical aligned feature table", assumptions: "Three predeclared small CPU architectures; softplus count rate; validation-only selection; fixed seeds", strengths: "Recorded linear, MLP, and regularized-MLP comparison", limits: "Architecture selection uses one validation block; no predictive uncertainty; cross-platform determinism is bounded", time: "Offline CPU cached training", uncertainty: "No parameter or predictive uncertainty", use: "Capacity comparison" },
  stan: { research: "How uncertain are the next-bin Poisson-regression coefficients and held-out counts under explicit priors?", inputs: "Training-only standardized features and thinned training rows", assumptions: "Poisson-log model; declared priors; convergence diagnostics; posterior predictive simulation", strengths: "Coefficient intervals, sampled-distribution view, sampler diagnostics, and a held-out posterior predictive check", limits: "Training rows are deterministically thinned; only every fifth posterior draw is shipped for display, and no prior-sensitivity run is available", time: "Offline cached CPU sampling", uncertainty: "Posterior credible intervals and held-out predictive intervals", use: "Uncertainty summary" },
} as const;

function comparisonPath(values: number[], maximum: number) {
  if (!values.length) return "";
  return values.map((value, index) => `${index === 0 ? "M" : "L"}${(20 + index * (400 / Math.max(1, values.length - 1))).toFixed(3)},${(110 - (value / maximum) * 84).toFixed(3)}`).join(" ");
}

export function ModelComparison() {
  const [dataset, setDataset] = useState<DemoDataset>(() => createSyntheticFallback());
  const [selected, setSelected] = useState<ModelKey>("nemos");
  useEffect(() => {
    const controller = new AbortController();
    loadDemoDataset(controller.signal).then(setDataset).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const artifacts = useMemo(() => (["nemos", "sklearn", "pytorch", "stan"] as ModelKey[]).map((key) => ({ key, artifact: dataset.models[key], description: descriptions[key] })), [dataset]);
  const active = artifacts.find((item) => item.key === selected) ?? artifacts[0];
  const plotMaximum = Math.max(1, ...(active.artifact?.observed ?? []), ...(active.artifact?.predicted ?? []));

  return (
    <div className="page-shell">
      <header className="page-intro">
        <p className="eyebrow">Models / aligned where valid</p>
        <h1>Compare questions before scores.</h1>
        <p>
          NeMoS, scikit-learn, and PyTorch answer the same next-100-ms count question on one identical frozen chronological split.
          Stan is shown as a separate uncertainty lane because a posterior model should not be forced into a simplistic leaderboard.
        </p>
        <span className="status-pill" data-tone={dataset.metadata.origin === "public-derived" ? "public" : "synthetic"}>{dataset.metadata.origin} artifact active</span>
      </header>

      <section className={styles.modelRail} aria-label="Choose a model">
        {artifacts.map(({ key, artifact, description }) => (
          <button aria-pressed={selected === key} key={key} onClick={() => setSelected(key)} type="button">
            <span className="mono">{key === "nemos" ? "GLM" : key === "sklearn" ? "BASE" : key === "pytorch" ? "MLP" : "BAYES"}</span>
            <strong>{artifact?.label ?? key}</strong>
            <small>{description.use}</small>
          </button>
        ))}
      </section>

      <section aria-live="polite" className={styles.focusModel}>
        <article>
          <p className="eyebrow">Selected model / {active.key}</p>
          <h2>{active.artifact?.label}</h2>
          <p className={styles.researchQuestion}>{active.description.research}</p>
          <dl className={styles.modelFacts}>
            <div><dt>Target</dt><dd>t1c1 next-100-ms spike count</dd></div>
            <div><dt>Inputs</dt><dd>{active.description.inputs}</dd></div>
            <div><dt>Assumptions</dt><dd>{active.description.assumptions}</dd></div>
            <div><dt>Training time</dt><dd>{active.description.time}</dd></div>
            <div><dt>Interpretability</dt><dd>{active.description.strengths}</dd></div>
            <div><dt>Uncertainty</dt><dd>{active.description.uncertainty}</dd></div>
          </dl>
          <p className="notice"><strong>Limitation:</strong> {active.description.limits}</p>
        </article>
        <article className={styles.predictionFigure}>
          <div className={styles.figureHead}><h3>Held-out prediction trace</h3><span className="status-pill" data-tone={active.artifact?.origin === "public-derived" ? "public" : "synthetic"}>{active.artifact?.status}</span></div>
          {active.artifact?.artifactAvailable ? <>
            <svg aria-label={`Observed and predicted held-out next-bin spike counts for ${active.artifact.label}. The displayed trace is strided for presentation; the metric uses all ${active.artifact.heldOutSampleCount ?? 1499} test rows. Artifact origin is ${active.artifact.origin}.`} role="img" viewBox="0 0 440 145">
              <line x1="20" x2="420" y1="110" y2="110" />
              <path d={comparisonPath(active.artifact.observed, plotMaximum)} className={styles.observed} />
              <path d={comparisonPath(active.artifact.predicted, plotMaximum)} className={styles.predicted} />
              <text x="22" y="132">Held-out contiguous time bins · display-strided trace</text>
            </svg>
            <div className={styles.legend}><span><i data-series="observed" />Observed</span><span><i data-series="predicted" />Predicted</span></div>
            <details><summary>Describe this chart and inspect values</summary><p>Observed and precomputed predicted next-100-ms t1c1 counts on the untouched final test block. The trace is display-strided; the score uses every held-out row.</p><TableScroll label={`Scrollable held-out prediction values for ${active.artifact.label}`}><table><caption>Up to 20 evenly spaced values from the displayed trace.</caption><thead><tr><th scope="col">Displayed index</th><th scope="col">Observed count</th><th scope="col">Predicted count</th></tr></thead><tbody>{active.artifact.observed.filter((_, index) => index % Math.max(1, Math.ceil(active.artifact.observed.length / 20)) === 0).map((value, row) => { const index = row * Math.max(1, Math.ceil(active.artifact.observed.length / 20)); return <tr key={index}><th scope="row">{index}</th><td>{value.toFixed(4)}</td><td>{active.artifact.predicted[index]?.toFixed(4)}</td></tr>; })}</tbody></table></TableScroll></details>
          </> : <p className="notice"><strong>No fitted artifact in the active fallback.</strong> No prediction trace or performance value is invented.</p>}
          <dl className={styles.score}><dt>{active.artifact?.metricLabel}</dt><dd>{active.artifact?.metricValue === null ? "Not computed" : active.artifact?.metricValue.toFixed(3)}</dd><dt>Execution</dt><dd>{active.artifact?.execution}</dd></dl>
          {active.artifact?.disclosure ? <p className="notice"><strong>Artifact status:</strong> {active.artifact.disclosure}</p> : null}
        </article>
      </section>

      <section aria-labelledby="matrix-heading">
        <div className="section-intro"><p className="eyebrow">Model matrix</p><h2 id="matrix-heading">Same task, different tradeoffs.</h2><p>Metric cells appear only when the artifact records a comparable definition and split. Status labels remain visible beside every value.</p></div>
        <div
          aria-label="Scrollable comparison table for the four model lanes"
          className="data-table-wrap"
          role="region"
          tabIndex={0}
        >
          <table className="data-table">
            <caption className="visually-hidden">Scientific roles, tradeoffs, actual artifact results, and limitations for the four fitted model lanes.</caption>
            <thead><tr><th>Model</th><th>Research role</th><th>Interpretability</th><th>Uncertainty support</th><th>Actual project result</th><th>Boundary</th></tr></thead>
            <tbody>
              {artifacts.map(({ key, artifact, description }) => (
                <tr key={key}><th scope="row">{artifact?.label}</th><td>{description.use}</td><td>{description.strengths}</td><td>{description.uncertainty}</td><td>{artifact?.metricLabel}: {artifact?.metricValue === null ? "Not computed" : artifact?.metricValue.toFixed(3)} <span className="status-pill" data-tone={artifact?.origin === "public-derived" ? "public" : "synthetic"}>{artifact?.origin}</span></td><td>{description.limits}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.highestScore}>
        <p className="eyebrow">Why not simply choose the lowest deviance?</p>
        <h2>The best number can still answer the wrong question.</h2>
        <div className="content-grid">
          <article><h3>Leakage</h3><p>A model can look strong if neighboring time points cross the train/test boundary. Contiguous folds with a gap reduce that risk.</p></article>
          <article><h3>Assumptions</h3><p>Deviance, posterior diagnostics, and calibration evidence describe different properties. Only evidence actually present in the artifact should enter a comparison.</p></article>
          <article><h3>Interpretability</h3><p>A small score gain may not justify a less inspectable model when the scientific goal is understanding covariate structure.</p></article>
          <article><h3>Generalization</h3><p>All results describe one public 600-second, eight-unit session. They do not establish biological or clinical generality.</p></article>
        </div>
      </section>
    </div>
  );
}
