"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DemoDataset } from "../../lib/labData";
import { createSyntheticFallback, loadDemoDataset } from "../../lib/labData";
import { PlotlyFigure, type PlotlyFigureSpec } from "./PlotlyFigure";
import { TableScroll } from "./TableScroll";
import styles from "./ScientificFigureViewer.module.css";

const figureIds = ["rate", "heatmap", "embedding", "coefficients", "posterior", "optimization", "cross-validation", "tuning-uncertainty", "residual"] as const;
const viewerUnits = ["t1c1", "t2c1", "t2c3", "t3c1", "t3c2", "t3c3", "t3c4", "t4c1"] as const;
type FigureId = (typeof figureIds)[number];
type ViewOptions = { unit: string; start: number; end: number };

const labels: Record<FigureId, string> = {
  rate: "Raster-linked firing rate",
  heatmap: "Neural population heatmap",
  embedding: "3D descriptive population embedding",
  coefficients: "Coefficient forest plot",
  posterior: "Posterior distribution",
  optimization: "Animated optimization history",
  "cross-validation": "Cross-validation comparison",
  "tuning-uncertainty": "Tuning curve with uncertainty",
  residual: "Model residual plot",
};

function representativeIndices(length: number, maximum = 20) {
  const step = Math.max(1, Math.ceil(length / maximum));
  return Array.from({ length: Math.ceil(length / step) }, (_, index) => index * step).filter((index) => index < length);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function inRange(times: number[], start: number, end: number) {
  const selected = times.map((time, index) => ({ time, index })).filter(({ time }) => time >= start && time <= end);
  if (selected.length || !times.length) return selected;
  const nearestIndex = times.reduce((best, time, index) => Math.abs(time - start) < Math.abs(times[best] - start) ? index : best, 0);
  return [{ time: times[nearestIndex], index: nearestIndex }];
}

function standardized(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length);
  const scale = Math.sqrt(variance) || 1;
  return values.map((value) => (value - mean) / scale);
}

function median(values: number[]) {
  if (!values.length) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function shouldHandleViewerArrowKey(target: EventTarget | null, currentTarget: EventTarget | null) {
  if (!(target instanceof Element) || target === currentTarget) return true;
  return !target.closest(
    'a[href], button, input, select, textarea, summary, [contenteditable="true"], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])',
  );
}

function figureSpec(id: FigureId, dataset: DemoDataset, view: ViewOptions): PlotlyFigureSpec {
  const selectedModel = dataset.models.nemos ?? Object.values(dataset.models)[0];
  const teal = "#136f63";
  const blue = "#315f7d";
  const violet = "#65518f";
  const amber = "#9b6420";
  if (id === "rate") {
    const selectedIndex = dataset.metadata.unitIds.indexOf(view.unit);
    const values = selectedIndex >= 0 ? dataset.derived.unitRates[selectedIndex] : dataset.derived.populationRate;
    const label = selectedIndex >= 0 ? view.unit : "Population mean";
    const points = inRange(dataset.derived.timeBins, view.start, view.end);
    const x = points.map(({ time }) => time);
    const y = points.map(({ index }) => values[index] ?? 0);
    return {
      data: [{ x, y, type: "scatter", mode: "lines", line: { color: teal, width: 2 }, name: label }],
      layout: { title: { text: `${label} firing rate · ${view.start.toFixed(0)}–${view.end.toFixed(0)} s` }, xaxis: { title: { text: "Elapsed time (s)" } }, yaxis: { title: { text: "Firing rate (Hz)" } }, hovermode: "x unified", dragmode: "zoom" },
      summary: `${label} firing rate is shown from ${view.start.toFixed(1)} to ${view.end.toFixed(1)} seconds. Drag horizontally to select a narrower linked interval, or use the keyboard-operable range controls. ${dataset.accessibleSummaries.heatmap}`,
      accessibleTable: { caption: `Representative ${label} firing-rate values inside the selected interval.`, columns: ["Elapsed time (s)", "Firing rate (Hz)"], rows: representativeIndices(x.length).map((index) => [x[index], y[index]]) },
    };
  }
  if (id === "heatmap") {
    const points = inRange(dataset.derived.timeBins, view.start, view.end);
    const x = points.map(({ time }) => time);
    const z = dataset.derived.unitRates.map((values) => points.map(({ index }) => values[index] ?? 0));
    return {
    data: [{ z, x, y: dataset.metadata.unitIds, type: "heatmap", colorscale: [[0, "#edf2ee"], [0.5, "#7bb8aa"], [1, "#0b574e"]], colorbar: { title: { text: "Hz" } }, hovertemplate: "Unit %{y}<br>%{x:.1f} s<br>%{z:.2f} Hz<extra></extra>" }],
    layout: { title: { text: `Unit-by-time firing-rate heatmap · ${view.start.toFixed(0)}–${view.end.toFixed(0)} s` }, xaxis: { title: { text: "Elapsed time (s)" } }, yaxis: { title: { text: "Sorted unit ID" } }, dragmode: "zoom" },
    summary: `${dataset.accessibleSummaries.heatmap} The active interval is ${view.start.toFixed(1)} to ${view.end.toFixed(1)} seconds. Drag horizontally or use the range controls to update both temporal panels.`,
    accessibleTable: { caption: `Per-unit summary of the plotted firing-rate heatmap from ${view.start.toFixed(1)} to ${view.end.toFixed(1)} seconds.`, columns: ["Unit", "Minimum (Hz)", "Mean (Hz)", "Maximum (Hz)"], rows: dataset.metadata.unitIds.map((unit, index) => { const values = z[index] ?? []; return [unit, Math.min(...values), values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length), Math.max(...values)]; }) },
    };
  }
  if (id === "embedding") {
    const logMedianIsi = dataset.units.map((unit) => {
      const intervals = unit.spikeTimes.slice(1).map((time, index) => time - unit.spikeTimes[index]).filter((value) => value > 0);
      return Math.log10(Math.max(1e-6, median(intervals)));
    });
    const z = standardized(logMedianIsi);
    return {
      data: [{ x: dataset.derived.embedding.x, y: dataset.derived.embedding.y, z, text: dataset.derived.embedding.unitId, type: "scatter3d", mode: "markers+text", textposition: "top center", marker: { size: 6, color: dataset.derived.embedding.x, colorscale: "Viridis", opacity: 0.82 }, hovertemplate: "Unit %{text}<br>Mean-rate z score %{x:.2f}<br>ISI-variability z score %{y:.2f}<br>Log-median-ISI z score %{z:.2f}<extra></extra>" }],
      layout: { title: { text: "Three declared unit-level descriptors · not dimensionality reduction" }, scene: { xaxis: { title: { text: "Mean firing rate (z score)" } }, yaxis: { title: { text: "ISI coefficient of variation (z score)" } }, zaxis: { title: { text: "log10 median ISI (z score)" } }, camera: { eye: { x: 1.35, y: 1.35, z: 1.1 } } }, legend: { orientation: "h" } },
      summary: "The first two axes reuse the artifact’s standardized mean firing rate and inter-spike-interval variability; the third is a browser-derived standardized log10 median inter-spike interval. This is a descriptive three-feature view of eight sorted units, not PCA, clustering, a biological cell-type assignment, or evidence that three dimensions are intrinsically correct.",
      accessibleTable: { caption: "The three declared standardized descriptive features for every plotted unit.", columns: ["Unit", "Mean firing-rate z score", "ISI-variability z score", "Log-median-ISI z score"], rows: dataset.derived.embedding.unitId.map((unit, index) => [unit, dataset.derived.embedding.x[index], dataset.derived.embedding.y[index], z[index]]) },
    };
  }
  if (id === "coefficients") {
    const posterior = dataset.models.stan?.posteriorSummary ?? [];
    if (!posterior.length) return { data: [], layout: { title: { text: "Coefficient artifact unavailable in this fallback" }, xaxis: { visible: false }, yaxis: { visible: false } }, summary: "No coefficient values are shown because the active fallback contains no computed Stan artifact.", accessibleTable: { caption: "Coefficient artifact status.", columns: ["Status"], rows: [["Unavailable in active fallback"]] } };
    const medians = posterior.map((entry) => entry.median);
    return { data: [{ x: medians, y: posterior.map((entry) => entry.parameter), type: "scatter", mode: "markers", marker: { color: violet, size: 9 }, error_x: { type: "data", array: posterior.map((entry) => entry.q95 - entry.median), arrayminus: posterior.map((entry) => entry.median - entry.q05), symmetric: false, visible: true, color: violet }, name: "Posterior median + 90% credible interval" }], layout: { title: { text: "Computed Stan coefficient intervals" }, xaxis: { title: { text: "Coefficient value (training-standardized scale)" }, zeroline: true }, yaxis: { title: { text: "Parameter" } } }, summary: `Computed posterior medians and 90 percent credible intervals for ${posterior.length} parameters. Maximum R-hat is ${dataset.models.stan.diagnostics?.maxRHat?.toFixed(3) ?? "recorded in the artifact"}; intervals are conditional on the specified Poisson-log model and priors, not confidence intervals or clinical certainty.`, accessibleTable: { caption: "Computed Stan posterior summaries and sampling diagnostics.", columns: ["Parameter", "Median", "5th percentile", "95th percentile", "R-hat", "Bulk ESS"], rows: posterior.map((entry) => [entry.parameter, entry.median, entry.q05, entry.q95, entry.rHat, entry.essBulk]) } };
  }
  if (id === "posterior") {
    const sample = dataset.models.stan?.posteriorDrawSamples;
    if (!sample?.parameters.length) return { data: [], layout: { title: { text: "Posterior-draw artifact unavailable in this fallback" }, xaxis: { visible: false }, yaxis: { visible: false } }, summary: "No posterior distribution is shown because the active fallback contains no sampled Stan artifact.", accessibleTable: { caption: "Posterior-draw artifact status.", columns: ["Status"], rows: [["Unavailable in active fallback"]] } };
    return {
      data: sample.parameters.map((entry) => ({ x: entry.values, type: "histogram", histnorm: "probability density", opacity: 0.48, nbinsx: 28, name: entry.parameter, hovertemplate: `${entry.parameter}<br>coefficient bin %{x:.3f}<br>density %{y:.3f}<extra></extra>` })),
      layout: { title: { text: "Actual post-warmup Stan draw distributions" }, xaxis: { title: { text: "Coefficient value (training-standardized scale)" } }, yaxis: { title: { text: "Empirical density" } }, barmode: "overlay", legend: { orientation: "h" } },
      summary: `Overlaid empirical distributions use ${sample.displayDrawCount} deterministically strided actual post-warmup draws for each of five parameters from ${sample.sourceDrawCount} source draws. They are not normal approximations. Full-draw diagnostics and quantiles remain in the coefficient view; these distributions are conditional on one declared Poisson-log model and priors.`,
      accessibleTable: { caption: "Summary of the actual posterior draw samples used by the histogram.", columns: ["Parameter", "Displayed draws", "Minimum", "Median", "Maximum"], rows: sample.parameters.map((entry) => [entry.parameter, entry.values.length, Math.min(...entry.values), median(entry.values), Math.max(...entry.values)]) },
    };
  }
  if (id === "cross-validation") {
    const audit = dataset.models.sklearn?.crossValidation;
    if (!audit?.summary.length) return { data: [], layout: { title: { text: "Cross-validation artifact unavailable in this fallback" }, xaxis: { visible: false }, yaxis: { visible: false } }, summary: "No cross-validation values are shown because the active fallback contains no computed model audit.", accessibleTable: { caption: "Cross-validation artifact status.", columns: ["Status"], rows: [["Unavailable in active fallback"]] } };
    return {
      data: [...[0, 1, 2].map((foldIndex) => ({ x: audit.summary.map((entry) => entry.alpha), y: audit.summary.map((entry) => entry.foldDeviances[foldIndex]), type: "scatter", mode: "lines+markers", name: audit.folds[foldIndex].id, hovertemplate: `${audit.folds[foldIndex].id}<br>alpha %{x}<br>validation deviance %{y:.6f}<extra></extra>` })), { x: audit.summary.map((entry) => entry.alpha), y: audit.summary.map((entry) => entry.meanPoissonDeviance), type: "scatter", mode: "lines+markers", line: { color: teal, width: 4 }, marker: { symbol: "diamond", size: 10 }, name: "Fold mean", hovertemplate: "alpha %{x}<br>mean validation deviance %{y:.6f}<extra></extra>" }],
      layout: { title: { text: "Training-only expanding-window alpha selection" }, xaxis: { title: { text: "PoissonRegressor alpha" }, type: "category" }, yaxis: { title: { text: "Mean Poisson deviance" } }, legend: { orientation: "h" } },
      summary: `Three expanding-window chronological folds stay entirely inside outer training rows ${audit.outerTrainingRows[0]} to ${audit.outerTrainingRows[1]}. Alpha ${audit.selectedAlpha} has the lowest mean fold-validation Poisson deviance. Outer validation and the final test block do not select alpha.`,
      accessibleTable: { caption: "Every alpha's three fold-validation deviances and mean; the selected row is identified in the last column.", columns: ["Alpha", ...audit.folds.map((fold) => fold.id), "Mean deviance", "Status"], rows: audit.summary.map((entry) => [entry.alpha, ...entry.foldDeviances, entry.meanPoissonDeviance, entry.alpha === audit.selectedAlpha ? "Selected" : "Compared"]) },
    };
  }
  if (id === "tuning-uncertainty") {
    const tuning = dataset.derived.tuning;
    const lower: number[] = [];
    const upper: number[] = [];
    const counts: number[] = [];
    tuning.rate.forEach((rate, index) => {
      const occupancy = tuning.occupancy[index];
      const count = Math.max(0, rate * occupancy);
      const standardError = occupancy > 0 ? Math.sqrt(Math.max(1, count)) / occupancy : 0;
      counts.push(count);
      lower.push(Math.max(0, rate - 1.96 * standardError));
      upper.push(rate + 1.96 * standardError);
    });
    return {
      data: [{ x: tuning.bins, y: lower, type: "scatter", mode: "lines", line: { width: 0 }, name: "Approximate lower bound", hoverinfo: "skip", showlegend: false }, { x: tuning.bins, y: upper, type: "scatter", mode: "lines", line: { width: 0 }, fill: "tonexty", fillcolor: "rgba(19,111,99,0.20)", name: "Approximate 95% band", hovertemplate: "speed %{x:.3f} m/s<br>approximate upper %{y:.2f} Hz<extra></extra>" }, { x: tuning.bins, y: tuning.rate, type: "scatter", mode: "lines+markers", line: { color: teal, width: 3 }, marker: { size: 7 }, name: "Occupancy-normalized rate", hovertemplate: "speed %{x:.3f} m/s<br>rate %{y:.2f} Hz<extra></extra>" }],
      layout: { title: { text: "Descriptive speed tuning with a count-based uncertainty guide" }, xaxis: { title: { text: "Speed-bin center (m/s)" } }, yaxis: { title: { text: "Firing rate (Hz)" }, rangemode: "tozero" }, legend: { orientation: "h" } },
      summary: `The solid trace is the precomputed occupancy-normalized t1c1 speed tuning curve. The shaded guide is a browser-derived normal approximation using rate times occupancy as the bin count and plus or minus 1.96 times a Poisson plug-in standard error; max(count, 1) prevents a zero-width display band. It is a descriptive uncertainty guide, not a bootstrap, posterior interval, or evidence of population generalization.`,
      accessibleTable: { caption: "Every speed bin, occupancy, implied spike count, rate, and approximate display band.", columns: ["Speed center (m/s)", "Occupancy (s)", "Implied count", "Rate (Hz)", "Approximate lower (Hz)", "Approximate upper (Hz)"], rows: tuning.bins.map((value, index) => [value, tuning.occupancy[index], counts[index], tuning.rate[index], lower[index], upper[index]]) },
    };
  }
  if (id === "residual") {
    const residual = selectedModel.observed.map((value, index) => value - selectedModel.predicted[index]);
    const elapsedTime = residual.map((_, index) => 450 + index * (selectedModel.displayStride ?? 5) * 0.1);
    return { data: [{ x: elapsedTime, y: residual, type: "scatter", mode: "markers", marker: { color: amber, size: 6, symbol: "x" }, name: "Residual" }], layout: { title: { text: "Observed minus predicted final-test count" }, xaxis: { title: { text: "Elapsed session time (s; every fifth test row shown)" } }, yaxis: { title: { text: "Residual (spike count / 100 ms)" }, zeroline: true, zerolinecolor: "#879891" } }, summary: `${dataset.accessibleSummaries.residual} Every ${selectedModel.displayStride ?? 5}th final-test row is displayed; ${selectedModel.metricLabel} uses all ${selectedModel.heldOutSampleCount ?? 1499} held-out rows.`, accessibleTable: { caption: "Representative display-strided residual values from the final test block.", columns: ["Elapsed session time (s)", "Observed minus predicted count"], rows: representativeIndices(residual.length).map((index) => [elapsedTime[index], residual[index]]) } };
  }
  const checkpoints = dataset.models.pytorch?.trainingCheckpoints ?? [];
  if (!checkpoints.length) return { data: [], layout: { title: { text: "Optimization artifact unavailable in this fallback" }, xaxis: { visible: false }, yaxis: { visible: false } }, summary: "No optimization history is shown because the active fallback contains no trained PyTorch artifact.", accessibleTable: { caption: "Optimization artifact status.", columns: ["Status"], rows: [["Unavailable in active fallback"]] } };
  const frameName = (index: number) => `checkpoint-${index}`;
  return {
    data: [{ x: [checkpoints[0].epoch], y: [checkpoints[0].trainingPoissonNll], type: "scatter", mode: "lines+markers", line: { color: blue, width: 2 }, name: "Training" }, { x: [checkpoints[0].epoch], y: [checkpoints[0].validationPoissonNll], type: "scatter", mode: "lines+markers", line: { color: amber, width: 2, dash: "dash" }, name: "Frozen validation" }],
    frames: checkpoints.map((_, index) => ({ name: frameName(index), data: [{ x: checkpoints.slice(0, index + 1).map((entry) => entry.epoch), y: checkpoints.slice(0, index + 1).map((entry) => entry.trainingPoissonNll) }, { x: checkpoints.slice(0, index + 1).map((entry) => entry.epoch), y: checkpoints.slice(0, index + 1).map((entry) => entry.validationPoissonNll) }] })),
    layout: { title: { text: "Selected PyTorch model · recorded optimization checkpoints" }, xaxis: { title: { text: "Epoch" }, range: [0, Math.max(...checkpoints.map((entry) => entry.epoch))] }, yaxis: { title: { text: "Poisson NLL" }, range: [Math.min(...checkpoints.flatMap((entry) => [entry.trainingPoissonNll, entry.validationPoissonNll])) - 0.02, Math.max(...checkpoints.flatMap((entry) => [entry.trainingPoissonNll, entry.validationPoissonNll])) + 0.02] }, legend: { orientation: "h" }, updatemenus: [{ type: "buttons", showactive: false, x: 0, y: 1.16, buttons: [{ label: "Play checkpoints", method: "animate", args: [null, { fromcurrent: true, frame: { duration: 240, redraw: false }, transition: { duration: 100 } }] }, { label: "Pause", method: "animate", args: [[null], { mode: "immediate", frame: { duration: 0, redraw: false }, transition: { duration: 0 } }] }] }], sliders: [{ active: 0, currentvalue: { prefix: "Recorded checkpoint " }, steps: checkpoints.map((entry, index) => ({ label: String(entry.epoch), method: "animate", args: [[frameName(index)], { mode: "immediate", frame: { duration: 0, redraw: false }, transition: { duration: 0 } }] })) }] },
    summary: `User-controlled animation reveals ${checkpoints.length} recorded CPU-training checkpoints for the validation-selected PyTorch architecture. It does not replay training. Architecture selection and early stopping used only the frozen validation block; the final test block remained untouched.`,
    accessibleTable: { caption: "Every recorded checkpoint for the validation-selected PyTorch model.", columns: ["Epoch", "Training Poisson NLL", "Validation Poisson NLL"], rows: checkpoints.map((entry) => [entry.epoch, entry.trainingPoissonNll, entry.validationPoissonNll]) },
  };
}

function LinkedContext({ dataset, unit, start, end }: { dataset: DemoDataset; unit: string; start: number; end: number }) {
  const selectedIndex = dataset.metadata.unitIds.indexOf(unit);
  const values = selectedIndex >= 0 ? dataset.derived.unitRates[selectedIndex] : dataset.derived.populationRate;
  const label = selectedIndex >= 0 ? unit : "population mean";
  const points = inRange(dataset.derived.timeBins, start, end).map(({ time, index }) => ({ time, value: values[index] ?? 0 }));
  const maximum = Math.max(1, ...points.map(({ value }) => value));
  const path = points.map(({ value }, index) => {
    const x = 12 + index * (416 / Math.max(1, points.length - 1));
    const y = 82 - (value / maximum) * 62;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  const rows = representativeIndices(points.length, 8).map((index) => points[index]);
  return (
    <section aria-labelledby="linked-context-heading" className={styles.linkedContext}>
      <div><p className="eyebrow">Linked panel</p><h3 id="linked-context-heading">{label} · active interval context</h3></div>
      <svg aria-label={`${label} firing-rate context from ${start.toFixed(1)} to ${end.toFixed(1)} seconds.`} role="img" viewBox="0 0 440 96">
        <line x1="12" x2="428" y1="82" y2="82" />
        <path d={path} />
      </svg>
      <details><summary>Inspect linked-panel values</summary><TableScroll label="Scrollable linked-panel firing-rate values"><table><caption>Representative values from the same unit and interval encoded in the URL.</caption><thead><tr><th scope="col">Time (s)</th><th scope="col">Rate (Hz)</th></tr></thead><tbody>{rows.map((point) => <tr key={point.time}><th scope="row">{point.time.toFixed(2)}</th><td>{point.value.toFixed(4)}</td></tr>)}</tbody></table></TableScroll></details>
    </section>
  );
}

export function ScientificFigureViewer() {
  const [dataset, setDataset] = useState<DemoDataset>(() => createSyntheticFallback());
  const [selected, setSelected] = useState<FigureId>("rate");
  const [unit, setUnit] = useState("t1c1");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(600);
  const [annotation, setAnnotation] = useState(true);
  const [annotationX, setAnnotationX] = useState(72);
  const [annotationY, setAnnotationY] = useState(22);
  const [lightweight, setLightweight] = useState(false);
  const [urlHydrated, setUrlHydrated] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const viewerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadDemoDataset(controller.signal).then(setDataset).catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const figure = params.get("figure");
      if (figureIds.includes(figure as FigureId)) setSelected(figure as FigureId);
      const requestedUnit = params.get("unit");
      if (requestedUnit === "population" || viewerUnits.includes(requestedUnit as (typeof viewerUnits)[number])) setUnit(requestedUnit ?? "t1c1");
      const requestedStart = clamp(Number(params.get("start") ?? 0) || 0, 0, 599);
      const requestedEnd = clamp(Number(params.get("end") ?? 600) || 600, requestedStart + 1, 600);
      setStart(requestedStart);
      setEnd(requestedEnd);
      setAnnotation(params.get("annotation") !== "0");
      setAnnotationX(clamp(Number(params.get("ax") ?? 72) || 72, 5, 95));
      setAnnotationY(clamp(Number(params.get("ay") ?? 22) || 22, 5, 90));
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      setLightweight(params.get("lite") === "1" || connection?.saveData === true);
      setUrlHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!urlHydrated) return;
    const params = new URLSearchParams(window.location.search);
    params.set("figure", selected);
    params.set("unit", unit);
    params.set("start", start.toFixed(1));
    params.set("end", end.toFixed(1));
    params.set("annotation", annotation ? "1" : "0");
    params.set("ax", String(annotationX));
    params.set("ay", String(annotationY));
    if (lightweight) params.set("lite", "1"); else params.delete("lite");
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [selected, unit, start, end, annotation, annotationX, annotationY, lightweight, urlHydrated]);

  const spec = useMemo(() => figureSpec(selected, dataset, { unit, start, end }), [selected, dataset, unit, start, end]);
  const figureOrigin = selected === "posterior" || selected === "coefficients"
    ? dataset.models.stan?.artifactAvailable ? dataset.models.stan.origin : "illustrative"
    : selected === "optimization"
      ? dataset.models.pytorch?.artifactAvailable ? dataset.models.pytorch.origin : "illustrative"
    : selected === "cross-validation"
      ? dataset.models.sklearn?.artifactAvailable ? dataset.models.sklearn.origin : "illustrative"
    : selected === "residual"
      ? dataset.models.nemos?.origin ?? "illustrative"
      : dataset.metadata.origin;

  function move(delta: number) {
    const index = figureIds.indexOf(selected);
    setSelected(figureIds[(index + delta + figureIds.length) % figureIds.length]);
  }

  const updateRange = useCallback((nextStart: number, nextEnd: number) => {
    const boundedStart = clamp(nextStart, 0, 599);
    const boundedEnd = clamp(nextEnd, boundedStart + 1, 600);
    setStart(Number(boundedStart.toFixed(1)));
    setEnd(Number(boundedEnd.toFixed(1)));
  }, []);

  return (
    <div className="page-shell">
      <header className="page-intro">
        <p className="eyebrow">Scientific Figure Viewer / Figurl-inspired</p>
        <h1>One shareable view, with the evidence attached.</h1>
        <p>
          This internal viewer is inspired by persistent scientific-figure sharing. It is not represented as an official Figurl instance.
          Figure, unit, interval, annotation coordinates, renderer mode, provenance, and analysis version remain visible and URL-backed.
        </p>
      </header>

      <section
        aria-label="Scientific figure viewer"
        className={styles.viewer}
        onKeyDown={(event) => {
          if (!shouldHandleViewerArrowKey(event.target, event.currentTarget)) return;
          if (event.key === "ArrowRight") {
            event.preventDefault();
            move(1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            move(-1);
          }
        }}
        ref={viewerRef}
        tabIndex={0}
      >
        <nav aria-label="Figure gallery" className={styles.figureIndex}>
          <div><p className="eyebrow">Figure index</p><span className="mono">09 views</span></div>
          {figureIds.map((id, index) => (
            <button aria-pressed={selected === id} key={id} onClick={() => setSelected(id)} type="button"><span className="mono">{String(index + 1).padStart(2, "0")}</span><strong>{labels[id]}</strong></button>
          ))}
        </nav>

        <div className={styles.figureStage}>
          <div className={styles.stageHead}>
            <div><p className="eyebrow">{figureOrigin} / Plotly.js 3.7.0</p><h2>{labels[selected]}</h2></div>
            <div className={styles.stageActions}>
              <button aria-pressed={annotation} className="button-quiet" onClick={() => setAnnotation((current) => !current)} type="button">{annotation ? "Hide annotation" : "Show annotation"}</button>
              <button className="button-quiet" onClick={() => document.fullscreenElement ? document.exitFullscreen?.() : viewerRef.current?.requestFullscreen?.()} type="button">Toggle fullscreen</button>
            </div>
          </div>
          <fieldset className={styles.viewControls}>
            <legend>Persistent linked view</legend>
            <label>Unit or population<select onChange={(event) => setUnit(event.target.value)} value={unit}><option value="population">Population mean</option>{dataset.metadata.unitIds.map((id) => <option key={id}>{id}</option>)}</select></label>
            <label>Start · {start.toFixed(1)} s<input max={Math.max(0, end - 1)} min="0" onChange={(event) => setStart(Number(event.target.value))} step="1" type="range" value={start} /></label>
            <label>End · {end.toFixed(1)} s<input max="600" min={Math.min(600, start + 1)} onChange={(event) => setEnd(Number(event.target.value))} step="1" type="range" value={end} /></label>
            <label className={styles.checkControl}><input checked={lightweight} onChange={(event) => setLightweight(event.target.checked)} type="checkbox" /> Lightweight HTML view</label>
          </fieldset>
          {annotation ? <div className={styles.annotationPanel}><p className={styles.annotation}><strong>Reading note:</strong> {spec.summary}</p><div><label>Annotation horizontal position · {annotationX}%<input max="95" min="5" onChange={(event) => setAnnotationX(Number(event.target.value))} type="range" value={annotationX} /></label><label>Annotation vertical position · {annotationY}%<input max="90" min="5" onChange={(event) => setAnnotationY(Number(event.target.value))} type="range" value={annotationY} /></label></div></div> : null}
          <div className={styles.plotWrap}>
            {annotation && !lightweight ? <span aria-label={`Persistent reading-note marker at ${annotationX} percent horizontal and ${annotationY} percent vertical.`} className={styles.annotationPin} role="img" style={{ left: `${annotationX}%`, top: `${annotationY}%` }}>1</span> : null}
            <PlotlyFigure lightweight={lightweight} onRangeSelect={selected === "rate" || selected === "heatmap" ? updateRange : undefined} spec={spec} />
          </div>
          <LinkedContext dataset={dataset} end={end} start={start} unit={unit} />
          <div className={styles.stepControls}><button className="button-quiet" onClick={() => move(-1)} type="button">← Previous</button><span className="mono">{figureIds.indexOf(selected) + 1} / {figureIds.length}</span><button className="button-quiet" onClick={() => move(1)} type="button">Next →</button></div>
        </div>

        <aside className={styles.figureMeta}>
          <p className="eyebrow">Figure metadata</p>
          <dl>
            <div><dt>Dataset</dt><dd>{dataset.metadata.origin === "public-derived" ? "DANDI 000582 @ 0.251111.2151" : "Deterministic synthetic fallback"}</dd></div>
            <div><dt>Figure origin</dt><dd>{figureOrigin}</dd></div>
            <div><dt>Analysis version</dt><dd>artifact schema v1</dd></div>
            <div><dt>Selected session</dt><dd>{dataset.metadata.origin === "public-derived" ? "sub-10073 / ses-17010302" : "Synthetic 600-second support"}</dd></div>
            <div><dt>View state</dt><dd><code>figure={selected} · unit={unit} · {start.toFixed(1)}–{end.toFixed(1)} s</code></dd></div>
            <div><dt>Annotation</dt><dd>{annotation ? `marker 1 at ${annotationX}% / ${annotationY}%` : "hidden"}</dd></div>
            <div><dt>Renderer</dt><dd>{lightweight ? "HTML summary + table" : "Lazy Plotly enhancement"}</dd></div>
            <div><dt>Keyboard</dt><dd>Left / Right arrows when the viewer frame is focused; controls keep their native arrow behavior</dd></div>
          </dl>
          <button className="button" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setShareStatus("View link copied."); } catch { setShareStatus("Copy unavailable; use the address bar."); } }} type="button">Copy persistent view link</button>
          <p aria-live="polite" className="fine-print">{shareStatus}</p>
          <a className="button-secondary" href="/sources">View source registry</a>
          <a className="button-quiet" href="/methods#models-heading">View analysis method</a>
          <a className="button-quiet" href="/notebooks#notebook-preview">Inspect executed code</a>
        </aside>
      </section>

      <section className="notice">
        <strong>Renderer and fallback:</strong> only one Plotly instance is mounted at a time. Save-Data can select the explicit lightweight mode,
        which keeps the summary and table without importing Plotly. Three-dimensional rendering is limited to the eight-unit descriptor view, where a third declared ISI feature adds inspectable information; every other chart uses ordinary two-dimensional axes.
      </section>
    </div>
  );
}
