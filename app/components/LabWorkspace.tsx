"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DemoDataset } from "../../lib/labData";
import { createSyntheticFallback, loadDemoDataset } from "../../lib/labData";
import { ChartDescription } from "./ChartDescription";
import { TableScroll } from "./TableScroll";
import styles from "./LabWorkspace.module.css";

type ModelKey = "nemos" | "sklearn" | "pytorch" | "stan";
const allowedUnitIds = ["t1c1", "t2c1", "t2c3", "t3c1", "t3c2", "t3c3", "t3c4", "t4c1"];

type ChartProps = {
  title: string;
  x: number[];
  y: number[];
  xLabel: string;
  yLabel: string;
  summary: string;
  tone?: "teal" | "blue" | "violet" | "amber";
  zeroLine?: boolean;
  onCenter?: (time: number) => void;
};

const tones = {
  teal: "var(--teal)",
  blue: "var(--blue)",
  violet: "var(--violet)",
  amber: "var(--amber)",
};

function extent(values: number[]) {
  if (values.length === 0) return [0, 1] as const;
  let min = values[0];
  let max = values[0];
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (min === max) return [min - 1, max + 1] as const;
  return [min, max] as const;
}

function quantile(values: number[], probability: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return sorted[lower] + fraction * ((sorted[lower + 1] ?? sorted[lower]) - sorted[lower]);
}

function useThemeRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setRevision((current) => current + 1));
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return revision;
}

function linePath(x: number[], y: number[], width = 440, height = 122, yExtent?: readonly [number, number]) {
  if (x.length === 0 || y.length === 0) return "";
  const [xMin, xMax] = extent(x);
  const [yMin, yMax] = yExtent ?? extent(y);
  return x
    .slice(0, y.length)
    .map((value, index) => {
      const px = 34 + ((value - xMin) / (xMax - xMin || 1)) * (width - 50);
      const py = 10 + (1 - (y[index] - yMin) / (yMax - yMin || 1)) * (height - 26);
      return `${index === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`;
    })
    .join(" ");
}

function LineChart({ title, x, y, xLabel, yLabel, summary, tone = "teal", zeroLine, onCenter }: ChartProps) {
  const [yMin, yMax] = extent(y);
  const [xMin, xMax] = extent(x);
  const zeroY = 10 + (1 - (0 - yMin) / (yMax - yMin || 1)) * 96;
  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHead}>
        <h3>{title}</h3>
        <span className="mono">{x.length} bins</span>
      </div>
      <svg
        aria-label={summary}
        className={styles.chartSvg}
        onKeyDown={onCenter ? (event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          onCenter((xMin + xMax) / 2 + (event.key === "ArrowLeft" ? -1 : 1) * (xMax - xMin) * 0.1);
        } : undefined}
        onPointerDown={onCenter ? (event) => {
          const box = event.currentTarget.getBoundingClientRect();
          onCenter(xMin + ((event.clientX - box.left) / box.width) * (xMax - xMin));
        } : undefined}
        role="img"
        tabIndex={onCenter ? 0 : undefined}
        viewBox="0 0 440 150"
      >
        <line className={styles.axis} x1="34" x2="424" y1="106" y2="106" />
        <line className={styles.axis} x1="34" x2="34" y1="10" y2="106" />
        {zeroLine && zeroY >= 10 && zeroY <= 106 ? <line className={styles.zero} x1="34" x2="424" y1={zeroY} y2={zeroY} /> : null}
        <path d={linePath(x, y)} fill="none" stroke={tones[tone]} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" />
        <text className={styles.axisLabel} x="226" y="140">{xLabel}</text>
        <text className={styles.axisLabel} transform="rotate(-90 9 58)" x="9" y="58">{yLabel}</text>
        <text className={styles.tick} x="34" y="119">{x[0]?.toFixed(1) ?? "0"}</text>
        <text className={styles.tick} textAnchor="end" x="424" y="119">{x.at(-1)?.toFixed(1) ?? "1"}</text>
        <text className={styles.tick} x="37" y="18">{yMax.toFixed(2)}</text>
        <text className={styles.tick} x="37" y="102">{yMin.toFixed(2)}</text>
      </svg>
      <ChartDescription summary={summary} x={x} xLabel={xLabel} y={y} yLabel={yLabel} />
    </article>
  );
}

function DualLineChart({ x, observed, predicted, summary }: { x: number[]; observed: number[]; predicted: number[]; summary: string }) {
  const yExtent = extent([...observed, ...predicted]);
  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHead}><h3>Observed vs predicted t1c1 · final test</h3><span className="mono">every 5th row shown</span></div>
      <svg aria-label={summary} className={styles.chartSvg} role="img" viewBox="0 0 440 150">
        <line className={styles.axis} x1="34" x2="424" y1="106" y2="106" />
        <line className={styles.axis} x1="34" x2="34" y1="10" y2="106" />
        <path d={linePath(x, observed, 440, 122, yExtent)} fill="none" stroke="var(--ink)" strokeLinecap="round" strokeWidth="2" />
        <path d={linePath(x, predicted, 440, 122, yExtent)} fill="none" stroke="var(--teal)" strokeDasharray="6 4" strokeLinecap="round" strokeWidth="2.3" />
        <text className={styles.axisLabel} x="226" y="140">Elapsed session time (s)</text>
        <text className={styles.axisLabel} transform="rotate(-90 9 58)" x="9" y="58">Count / 100 ms</text>
        <text className={styles.tick} x="34" y="119">{x[0]?.toFixed(1)}</text><text className={styles.tick} textAnchor="end" x="424" y="119">{x.at(-1)?.toFixed(1)}</text>
      </svg>
      <p className={styles.interactionHint}><span aria-hidden="true">━━</span> observed · <span aria-hidden="true">┅┅</span> predicted</p>
      <ChartDescription summary={summary} />
      <details><summary>Inspect representative observed and predicted values</summary><TableScroll label="Scrollable observed and predicted final-test values"><table><caption>Up to 20 evenly spaced points from the display-strided final-test trace.</caption><thead><tr><th scope="col">Elapsed time (s)</th><th scope="col">Observed</th><th scope="col">Predicted</th></tr></thead><tbody>{observed.filter((_, index) => index % Math.max(1, Math.ceil(observed.length / 20)) === 0).map((value, row) => { const index = row * Math.max(1, Math.ceil(observed.length / 20)); return <tr key={index}><th scope="row">{x[index]?.toFixed(1)}</th><td>{value.toFixed(4)}</td><td>{predicted[index]?.toFixed(4)}</td></tr>; })}</tbody></table></TableScroll></details>
    </article>
  );
}

function SplitTimeline() {
  const phases = [
    { label: "Train", rows: "0–3,599", time: "0.0–359.9 s", width: 60 },
    { label: "Validation", rows: "3,600–4,199", time: "360.0–419.9 s", width: 10 },
    { label: "Gap", rows: "4,200–4,499", time: "420.0–449.9 s", width: 5 },
    { label: "Final test", rows: "4,500–5,998", time: "450.0–599.8 s", width: 25 },
  ];
  return <article className={`${styles.chartCard} ${styles.wideChart}`}><div className={styles.chartHead}><h3>Frozen chronological evaluation timeline</h3><span className="mono">5,999 next-bin rows</span></div><ol className={styles.splitTimeline}>{phases.map((phase) => <li key={phase.label} style={{ flexBasis: `${phase.width}%` }}><strong>{phase.label}</strong><span>{phase.time}</span><small>rows {phase.rows}</small></li>)}</ol><p className={styles.interactionHint}>Only PyTorch uses validation for early stopping. Fixed NeMoS, scikit-learn, and Stan configurations report validation without tuning on it. The 30-second gap precedes the untouched final test.</p></article>;
}

function ModelComparisonPanel({ data, selected, onSelect }: { data: DemoDataset; selected: ModelKey; onSelect: (model: ModelKey) => void }) {
  const keys: ModelKey[] = ["nemos", "sklearn", "pytorch", "stan"];
  return (
    <article className={`${styles.chartCard} ${styles.wideChart}`}>
      <div className={styles.chartHead}><h3>Aligned model comparison</h3><span className="mono">same target · split · metric</span></div>
      <div className="table-scroll" role="region" aria-label="Aligned model comparison table" tabIndex={0}>
        <table>
          <caption>All available model lanes are shown; selecting a row updates the prediction and residual views. Lower deviance is better, but one split is not a benchmark ranking.</caption>
          <thead><tr><th scope="col">Model</th><th scope="col">Validation deviance</th><th scope="col">Final-test deviance</th><th scope="col">Uncertainty</th><th scope="col">Inspect</th></tr></thead>
          <tbody>{keys.map((key) => {
            const record = data.models[key];
            return <tr key={key}><th scope="row">{record.label}</th><td>{record.validationMetricValue?.toFixed(4) ?? "Not computed"}</td><td>{record.metricValue?.toFixed(4) ?? "Not computed"}</td><td>{key === "stan" ? "Posterior intervals + predictive check" : key === "pytorch" ? "Validation-selected checkpoint" : "Point estimate"}</td><td><button aria-pressed={selected === key} className="button-quiet" disabled={!record.artifactAvailable} onClick={() => onSelect(key)} type="button">{selected === key ? "Selected" : "Inspect"}</button></td></tr>;
          })}</tbody>
        </table>
      </div>
    </article>
  );
}

function ScatterChart({ data, summary }: { data: DemoDataset["derived"]["embedding"]; summary: string }) {
  const [xMin, xMax] = extent(data.x);
  const [yMin, yMax] = extent(data.y);
  const colors = ["var(--teal)", "var(--blue)", "var(--violet)", "var(--amber)"];
  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHead}><h3>Descriptive unit feature map</h3><span className="mono">2 standardized features</span></div>
      <svg aria-label={summary} className={styles.chartSvg} role="img" viewBox="0 0 440 150">
        <line className={styles.axis} x1="34" x2="424" y1="106" y2="106" />
        <line className={styles.axis} x1="34" x2="34" y1="10" y2="106" />
        {data.x.slice(0, 240).map((value, index) => (
          <circle
            cx={Number((34 + ((value - xMin) / (xMax - xMin || 1)) * 390).toFixed(4))}
            cy={Number((10 + (1 - (data.y[index] - yMin) / (yMax - yMin || 1)) * 96).toFixed(4))}
            fill={colors[index % colors.length]}
            key={`${index}-${value}`}
            opacity="0.66"
            r="2.6"
          />
        ))}
        <text className={styles.axisLabel} x="226" y="140">Mean firing rate (z score)</text>
        <text className={styles.axisLabel} transform="rotate(-90 9 58)" x="9" y="58">ISI variability (z score)</text>
      </svg>
      <ChartDescription summary={summary} x={data.x} xLabel="Mean firing-rate z score" y={data.y} yLabel="ISI variability z score" />
    </article>
  );
}

function RasterCanvas({ data, start, end, selectedUnit, onCenter }: { data: DemoDataset; start: number; end: number; selectedUnit: string; onCenter: (time: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRevision = useThemeRevision();
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(box.width));
    const height = Math.max(1, Math.floor(box.height));
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const css = getComputedStyle(document.documentElement);
    context.fillStyle = css.getPropertyValue("--paper-inset").trim();
    context.fillRect(0, 0, width, height);
    const span = Math.max(0.001, end - start);
    data.units.forEach((unit, unitIndex) => {
      const y = 18 + (unitIndex / Math.max(1, data.units.length - 1)) * (height - 36);
      const selected = unit.id === selectedUnit;
      context.fillStyle = css.getPropertyValue(selected ? "--amber" : unitIndex % 2 ? "--blue" : "--teal").trim();
      for (const spike of unit.spikeTimes) {
        if (spike < start || spike > end) continue;
        const x = 42 + ((spike - start) / span) * (width - 58);
        context.fillRect(x, y - (selected ? 5 : 3), selected ? 2 : 1.25, selected ? 10 : 6);
      }
      context.fillStyle = css.getPropertyValue("--ink-muted").trim();
      context.font = "10px ui-monospace, monospace";
      context.fillText(unit.id, 5, y + 3);
    });
  }, [data, start, end, selectedUnit, themeRevision]);

  return (
    <article className={`${styles.chartCard} ${styles.wideChart}`}>
      <div className={styles.chartHead}><h3>Spike raster</h3><span className="mono">spike time · s</span></div>
      <canvas
        aria-label={`Spike raster for ${data.units.length} units from ${start.toFixed(1)} to ${end.toFixed(1)} seconds. Selected unit ${selectedUnit} is highlighted.`}
        className={styles.raster}
        onPointerDown={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          onCenter(start + ((event.clientX - box.left) / box.width) * (end - start));
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const direction = event.key === "ArrowLeft" ? -1 : 1;
          onCenter((start + end) / 2 + direction * (end - start) * 0.1);
        }}
        ref={canvasRef}
        role="img"
        tabIndex={0}
      />
      <p className={styles.interactionHint}>Tap or click the raster to center the linked interval. Keyboard users can focus it and press Left or Right Arrow.</p>
      <ChartDescription summary={data.accessibleSummaries.raster} />
      <details><summary>Visible spike counts by unit</summary><TableScroll label="Scrollable visible spike counts by unit"><table><caption>Counts inside the selected {start.toFixed(1)}–{end.toFixed(1)} second interval.</caption><thead><tr><th scope="col">Unit</th><th scope="col">Visible spikes</th></tr></thead><tbody>{data.units.map((unit) => <tr key={unit.id}><th scope="row">{unit.id}</th><td>{unit.spikeTimes.filter((time) => time >= start && time <= end).length}</td></tr>)}</tbody></table></TableScroll></details>
    </article>
  );
}

function HeatmapCanvas({ data, start, end, onCenter }: { data: DemoDataset; start: number; end: number; onCenter: (time: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRevision = useThemeRevision();
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(box.width));
    const height = Math.max(1, Math.floor(box.height));
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const indices = data.derived.timeBins.map((time, index) => ({ time, index })).filter(({ time }) => time >= start && time <= end);
    const cellWidth = width / Math.max(1, indices.length);
    const cellHeight = height / Math.max(1, data.derived.unitRates.length);
    const maxRate = Math.max(1, ...data.derived.unitRates.flat());
    data.derived.unitRates.forEach((rates, row) => {
      indices.forEach(({ index }, column) => {
        const ratioValue = Math.min(1, Math.max(0, rates[index] / maxRate));
        const dark = document.documentElement.dataset.theme === "dark";
        // Canvas does not consistently resolve color-mix(). Use two explicit
        // ramps and redraw when the root theme attribute changes.
        const red = Math.round((dark ? 19 : 225) + ratioValue * (dark ? 23 : -205));
        const green = Math.round((dark ? 31 : 235) + ratioValue * (dark ? 143 : -98));
        const blue = Math.round((dark ? 29 : 230) + ratioValue * (dark ? 117 : -117));
        context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        context.fillRect(column * cellWidth, row * cellHeight, Math.ceil(cellWidth + 0.5), Math.ceil(cellHeight + 0.5));
      });
    });
  }, [data, start, end, themeRevision]);
  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHead}><h3>Population rate heatmap</h3><span className="mono">Hz · unit × time</span></div>
      <canvas
        aria-label={`${data.accessibleSummaries.heatmap} Tap, click, or use Left and Right Arrow to center the linked interval.`}
        className={styles.heatmap}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          onCenter((start + end) / 2 + (event.key === "ArrowLeft" ? -1 : 1) * (end - start) * 0.1);
        }}
        onPointerDown={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          onCenter(start + ((event.clientX - box.left) / box.width) * (end - start));
        }}
        ref={canvasRef}
        role="img"
        tabIndex={0}
      />
      <ChartDescription summary={data.accessibleSummaries.heatmap} />
      <details><summary>Mean rate by unit in this interval</summary><TableScroll label="Scrollable mean firing rates by unit"><table><caption>Mean precomputed firing rate for each unit inside the selected interval.</caption><thead><tr><th scope="col">Unit</th><th scope="col">Mean rate (Hz)</th></tr></thead><tbody>{data.metadata.unitIds.map((unit, unitIndex) => { const values = data.derived.timeBins.map((time, index) => ({ time, value: data.derived.unitRates[unitIndex]?.[index] ?? 0 })).filter(({ time }) => time >= start && time <= end).map(({ value }) => value); const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; return <tr key={unit}><th scope="row">{unit}</th><td>{mean.toFixed(3)}</td></tr>; })}</tbody></table></TableScroll></details>
    </article>
  );
}

function movingAverage(values: number[], windowSize: number) {
  const size = Math.max(1, windowSize);
  return values.map((_, index) => {
    const start = Math.max(0, index - size + 1);
    const slice = values.slice(start, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

function queryNumber(params: URLSearchParams, name: string, fallback: number) {
  const raw = params.get(name);
  if (raw === null || raw.trim() === "") return fallback;
  if (raw.length > 32) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function LabWorkspace() {
  const [dataset, setDataset] = useState<DemoDataset>(() => createSyntheticFallback());
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(120);
  const [selectedUnit, setSelectedUnit] = useState("t1c1");
  const [comparisonUnit, setComparisonUnit] = useState("t2c1");
  const [viewMode, setViewMode] = useState<"unit" | "population">("unit");
  const [binSize, setBinSize] = useState(2);
  const [smoothing, setSmoothing] = useState(3);
  const [model, setModel] = useState<ModelKey>("nemos");
  const [showSpikes, setShowSpikes] = useState(true);
  const [showBehavior, setShowBehavior] = useState(true);
  const [showSplit, setShowSplit] = useState(true);
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [researchMode, setResearchMode] = useState(false);
  const [urlHydrated, setUrlHydrated] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedModel = params.get("model");
      const requestedStart = clamp(queryNumber(params, "start", 0), 0, 599);
      const requestedEnd = clamp(queryNumber(params, "end", 120), requestedStart + 1, 600);
      const requestedUnit = params.get("unit");
      const requestedComparisonUnit = params.get("compare");
      const requestedBin = queryNumber(params, "bin", 2);
      const requestedSmoothing = queryNumber(params, "smooth", 3);
      setStart(requestedStart);
      setEnd(requestedEnd);
      setSelectedUnit(requestedUnit && allowedUnitIds.includes(requestedUnit) ? requestedUnit : "t1c1");
      setComparisonUnit(requestedComparisonUnit && allowedUnitIds.includes(requestedComparisonUnit) ? requestedComparisonUnit : "t2c1");
      setViewMode(params.get("view") === "population" ? "population" : "unit");
      setBinSize([0.1, 0.5, 1, 2, 5].includes(requestedBin) ? requestedBin : 2);
      setSmoothing([1, 3, 5, 9].includes(requestedSmoothing) ? requestedSmoothing : 3);
      setModel(requestedModel === "sklearn" || requestedModel === "pytorch" || requestedModel === "stan" ? requestedModel : "nemos");
      setResearchMode(params.get("research") === "1");
      setUrlHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDemoDataset(controller.signal).then((value) => {
      setDataset(value);
      setSelectedUnit((current) => value.metadata.unitIds.includes(current) ? current : value.metadata.unitIds[0]);
      setEnd((current) => Math.min(value.metadata.durationSeconds, Math.max(20, current)));
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!urlHydrated) return;
    const params = new URLSearchParams();
    params.set("unit", selectedUnit);
    params.set("compare", comparisonUnit);
    params.set("view", viewMode);
    params.set("start", start.toFixed(1));
    params.set("end", end.toFixed(1));
    params.set("bin", String(binSize));
    params.set("smooth", String(smoothing));
    params.set("model", model);
    if (researchMode) params.set("research", "1");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [selectedUnit, comparisonUnit, viewMode, start, end, binSize, smoothing, model, researchMode, urlHydrated]);

  const selectedModel = dataset.models[model] ?? Object.values(dataset.models)[0];
  const selectedUnitIndex = Math.max(0, dataset.metadata.unitIds.indexOf(selectedUnit));
  const selectedRates = viewMode === "population"
    ? dataset.derived.populationRate
    : dataset.derived.unitRates[selectedUnitIndex] ?? dataset.derived.populationRate;

  const selectedDiagnostics = useMemo(() => {
    const unit = dataset.units.find((candidate) => candidate.id === selectedUnit) ?? dataset.units[0];
    const comparison = dataset.units.find((candidate) => candidate.id === comparisonUnit) ?? dataset.units[1] ?? dataset.units[0];
    const positionRows = dataset.position.timestamps
      .map((time, index) => ({ time, speed: dataset.position.speed[index] ?? 0 }))
      .filter(({ time }) => time >= start && time <= end);
    const speedMaximum = Math.max(0.001, quantile(positionRows.map(({ speed }) => speed), 0.99));
    const tuningBinCount = 16;
    const tuningOccupancy = Array.from({ length: tuningBinCount }, () => 0);
    const tuningSpikes = Array.from({ length: tuningBinCount }, () => 0);
    const sampleInterval = dataset.metadata.positionSampleIntervalSeconds || 0.1;
    positionRows.forEach(({ speed }) => {
      const index = Math.min(tuningBinCount - 1, Math.floor((speed / speedMaximum) * tuningBinCount));
      tuningOccupancy[index] += sampleInterval;
    });
    const visibleSpikes = unit.spikeTimes.filter((time) => time >= start && time <= end);
    visibleSpikes.forEach((time) => {
      const rawIndex = (time - (dataset.position.timestamps[0] ?? 0)) / sampleInterval;
      const lower = Math.min(dataset.position.timestamps.length - 1, Math.max(0, Math.floor(rawIndex)));
      const upper = Math.min(dataset.position.timestamps.length - 1, lower + 1);
      const fraction = Math.min(1, Math.max(0, rawIndex - lower));
      const speed = (dataset.position.speed[lower] ?? 0) * (1 - fraction) + (dataset.position.speed[upper] ?? 0) * fraction;
      const index = Math.min(tuningBinCount - 1, Math.floor((speed / speedMaximum) * tuningBinCount));
      tuningSpikes[index] += 1;
    });
    const tuningX = tuningSpikes.map((_, index) => (index + 0.5) * speedMaximum / tuningBinCount);
    const tuningY = tuningSpikes.map((count, index) => tuningOccupancy[index] > 0 ? count / tuningOccupancy[index] : 0);

    const intervals = visibleSpikes.slice(1).map((time, index) => time - visibleSpikes[index]).filter((value) => value >= 0 && value <= 2);
    const isiBinCount = 40;
    const isiX = Array.from({ length: isiBinCount }, (_, index) => (index + 0.5) * 2 / isiBinCount);
    const isiY = Array.from({ length: isiBinCount }, () => 0);
    intervals.forEach((value) => { isiY[Math.min(isiBinCount - 1, Math.floor(value / 2 * isiBinCount))] += 1; });

    const lagWindow = 0.25;
    const lagWidth = 0.01;
    const lagCount = Math.ceil(2 * lagWindow / lagWidth);
    const crossX = Array.from({ length: lagCount }, (_, index) => -lagWindow + (index + 0.5) * lagWidth);
    const crossY = Array.from({ length: lagCount }, () => 0);
    const comparisonSpikes = comparison.spikeTimes.filter((time) => time >= start && time <= end);
    visibleSpikes.forEach((firstSpike, firstIndex) => {
      comparisonSpikes.forEach((secondSpike, secondIndex) => {
        if (unit.id === comparison.id && firstIndex === secondIndex) return;
        const lag = secondSpike - firstSpike;
        if (lag < -lagWindow || lag > lagWindow) return;
        crossY[Math.min(lagCount - 1, Math.floor((lag + lagWindow) / lagWidth))] += 1;
      });
    });
    return { tuningX, tuningY, tuningOccupancy, isiX, isiY, crossX, crossY, visibleSpikeCount: visibleSpikes.length };
  }, [dataset, selectedUnit, comparisonUnit, start, end]);

  const selectedSeries = useMemo(() => {
    const points = dataset.derived.timeBins
      .map((time, index) => ({ time, value: selectedRates[index] ?? 0 }))
      .filter(({ time }) => time >= start && time <= end);
    const groups = new Map<number, { time: number; sum: number; count: number }>();
    for (const point of points) {
      const groupIndex = Math.floor((point.time - start) / binSize);
      const current = groups.get(groupIndex) ?? { time: start + (groupIndex + 0.5) * binSize, sum: 0, count: 0 };
      current.sum += point.value;
      current.count += 1;
      groups.set(groupIndex, current);
    }
    const aggregated = [...groups.values()].map((group) => ({ time: group.time, value: group.sum / Math.max(1, group.count) }));
    return { x: aggregated.map((point) => point.time), y: movingAverage(aggregated.map((point) => point.value), smoothing) };
  }, [dataset, selectedRates, start, end, binSize, smoothing]);

  const behaviorSeries = useMemo(() => {
    const points = dataset.position.timestamps
      .map((time, index) => ({ time, value: dataset.position.speed[index] ?? 0 }))
      .filter(({ time }) => time >= start && time <= end);
    const stride = Math.max(1, Math.floor(points.length / 180));
    const thinned = points.filter((_, index) => index % stride === 0);
    return { x: thinned.map((point) => point.time), y: movingAverage(thinned.map((point) => point.value), smoothing) };
  }, [dataset, start, end, smoothing]);

  const residuals = selectedModel.observed.map((value, index) => value - (selectedModel.predicted[index] ?? value));
  const predictionX = selectedModel.observed.map((_, index) => 450 + index * (selectedModel.displayStride ?? 5) * 0.1);
  const visibleSpan = Math.max(20, end - start);

  function centerInterval(time: number) {
    const nextStart = Math.min(dataset.metadata.durationSeconds - visibleSpan, Math.max(0, time - visibleSpan / 2));
    setStart(Number(nextStart.toFixed(1)));
    setEnd(Number(Math.min(dataset.metadata.durationSeconds, nextStart + visibleSpan).toFixed(1)));
  }

  function reset() {
    setStart(0); setEnd(Math.min(120, dataset.metadata.durationSeconds)); setSelectedUnit(dataset.metadata.unitIds[0]);
    setComparisonUnit(dataset.metadata.unitIds[1] ?? dataset.metadata.unitIds[0]); setViewMode("unit");
    setBinSize(2); setSmoothing(3); setModel("nemos"); setShowSpikes(true); setShowBehavior(true);
    setShowSplit(true); setShowUncertainty(true); setResearchMode(false);
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus("Analysis link copied.");
    } catch {
      setShareStatus("Copy was unavailable. Use the address bar to share this state.");
    }
  }

  return (
    <div className={styles.lab}>
      <header className={styles.labHeader}>
        <div>
          <p className="eyebrow">Neural-data analysis workspace</p>
          <h1>Inspect one interval from source to model.</h1>
          <p>
            The raster, heatmap, behavior trace, and selected-unit rate share one time window. Whole-session reference
            diagnostics are labeled separately. A checksummed public derivative loads when available; an explicitly synthetic fallback keeps the interface readable offline.
          </p>
        </div>
        <div className={styles.labStatus}>
          <span className="status-pill" data-tone={dataset.metadata.origin === "public-derived" ? "public" : "synthetic"}>
            {loading ? "Loading artifact…" : dataset.metadata.origin === "public-derived" ? "Public-derived artifact" : "Synthetic fallback active"}
          </span>
          <span className="status-pill" data-tone="precomputed">{Object.values(dataset.models).some((entry) => entry.artifactAvailable) ? "Model artifacts available" : "Model specifications only"}</span>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside aria-label="Analysis controls" className={styles.controls}>
          <div className={styles.panelHead}><span className="mono">01</span><h2>Controls</h2></div>
          <label>
            Session
            <select disabled value={dataset.metadata.origin === "public-derived" ? "sub-10073_ses-17010302" : "synthetic-fallback"}><option>{dataset.metadata.origin === "public-derived" ? "sub-10073 · ses-17010302" : "Deterministic synthetic fallback"}</option></select>
          </label>
          <label>
            Target unit
            <select onChange={(event) => setSelectedUnit(event.target.value)} value={selectedUnit}>
              {dataset.metadata.unitIds.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>
          <label>
            Rate view
            <select onChange={(event) => setViewMode(event.target.value as "unit" | "population")} value={viewMode}>
              <option value="unit">Selected unit</option>
              <option value="population">Population mean</option>
            </select>
          </label>
          <label>
            Correlation comparison
            <select onChange={(event) => setComparisonUnit(event.target.value)} value={comparisonUnit}>
              {dataset.metadata.unitIds.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>
          <fieldset>
            <legend>Selected interval</legend>
            <label>Start: {start.toFixed(1)} s
              <input max={Math.max(0, end - 1)} min="0" onChange={(event) => setStart(Number(event.target.value))} step="1" type="range" value={start} />
            </label>
            <label>End: {end.toFixed(1)} s
              <input max={dataset.metadata.durationSeconds} min={Math.min(dataset.metadata.durationSeconds, start + 1)} onChange={(event) => setEnd(Number(event.target.value))} step="1" type="range" value={end} />
            </label>
          </fieldset>
          <label>Aggregation interval
            <select onChange={(event) => setBinSize(Number(event.target.value))} value={binSize}>
              <option value="0.1">100 ms</option><option value="0.5">500 ms</option><option value="1">1 s</option><option value="2">2 s</option><option value="5">5 s</option>
            </select>
          </label>
          <label>Smoothing window
            <select onChange={(event) => setSmoothing(Number(event.target.value))} value={smoothing}>
              <option value="1">None</option><option value="3">3 bins</option><option value="5">5 bins</option><option value="9">9 bins</option>
            </select>
          </label>
          <label>Model
            <select onChange={(event) => setModel(event.target.value as ModelKey)} value={model}>
              <option value="nemos">NeMoS GLM</option><option value="sklearn">scikit-learn baseline</option><option value="pytorch">PyTorch MLP</option><option value="stan">Stan uncertainty</option>
            </select>
          </label>
          <div className={styles.checks}>
            <label><input checked={showBehavior} onChange={(event) => setShowBehavior(event.target.checked)} type="checkbox" /> Behavior traces</label>
            <label><input checked={showSpikes} onChange={(event) => setShowSpikes(event.target.checked)} type="checkbox" /> Spike views</label>
            <label><input checked={showSplit} onChange={(event) => setShowSplit(event.target.checked)} type="checkbox" /> Evaluation timeline</label>
            <label><input checked={showUncertainty} onChange={(event) => setShowUncertainty(event.target.checked)} type="checkbox" /> Uncertainty note</label>
            <label><input checked={researchMode} onChange={(event) => setResearchMode(event.target.checked)} type="checkbox" /> Research mode</label>
          </div>
          <div className="button-row">
            <button className="button-secondary" onClick={reset} type="button">Reset analysis</button>
            <button className="button-quiet" onClick={copyShareLink} type="button">Copy state link</button>
          </div>
          <p aria-live="polite" className={styles.shareStatus}>{shareStatus}</p>
        </aside>

        <section aria-label="Linked scientific visualizations" className={styles.visuals}>
          <div className={styles.mobileSummary}>
            <strong>{selectedUnit}</strong><span>{start.toFixed(0)}–{end.toFixed(0)} s</span><span>{selectedModel.label}</span>
          </div>
          {showSpikes ? <RasterCanvas data={dataset} end={end} onCenter={centerInterval} selectedUnit={selectedUnit} start={start} /> : null}
          <div className={styles.chartGrid}>
            {showSplit ? <SplitTimeline /> : null}
            <ModelComparisonPanel data={dataset} onSelect={setModel} selected={model} />
            {showSpikes ? <HeatmapCanvas data={dataset} end={end} onCenter={centerInterval} start={start} /> : null}
            {showBehavior ? <LineChart onCenter={centerInterval} summary={`${dataset.accessibleSummaries.behavior} Tap, click, or use Left and Right Arrow to center the linked interval.`} title="Behavioral speed trace · selected interval" tone="blue" x={behaviorSeries.x} xLabel="Time (s)" y={behaviorSeries.y} yLabel="Speed (m/s)" /> : null}
            <LineChart summary={`Occupancy-aware descriptive speed tuning for ${selectedUnit} inside ${start.toFixed(1)}–${end.toFixed(1)} seconds. ${selectedDiagnostics.visibleSpikeCount} spikes contribute; the displayed speed range ends at the selected interval's 99th percentile.`} title={`${selectedUnit} speed tuning · selected interval`} x={selectedDiagnostics.tuningX} xLabel="Speed (m/s)" y={selectedDiagnostics.tuningY} yLabel="Firing rate (Hz)" />
            <LineChart summary={`Inter-spike interval counts for ${selectedUnit} inside ${start.toFixed(1)}–${end.toFixed(1)} seconds. Only positive intervals through two seconds are counted.`} title={`${selectedUnit} inter-spike intervals · selected interval`} tone="amber" x={selectedDiagnostics.isiX} xLabel="Interval (s)" y={selectedDiagnostics.isiY} yLabel="Count" />
            <LineChart summary={`Event-pair lag counts for ${selectedUnit} and ${comparisonUnit} inside ${start.toFixed(1)}–${end.toFixed(1)} seconds. Same-event self-pairs are excluded when both selections match; counts do not establish connectivity.`} title={`${selectedUnit} ↔ ${comparisonUnit} cross-correlogram · selected interval`} tone="violet" x={selectedDiagnostics.crossX} xLabel="Lag (s)" y={selectedDiagnostics.crossY} yLabel="Event-pair count" />
            {selectedModel.artifactAvailable ? <DualLineChart observed={selectedModel.observed} predicted={selectedModel.predicted} summary={`${dataset.accessibleSummaries.prediction} Every fifth test row is plotted from elapsed session time 450 seconds onward; ${selectedModel.metricLabel} uses all ${selectedModel.heldOutSampleCount ?? 1499} final-test rows.`} x={predictionX} /> : null}
            {selectedModel.artifactAvailable ? <LineChart summary={`${dataset.accessibleSummaries.residual} Every fifth test row is displayed; the metric uses all ${selectedModel.heldOutSampleCount ?? 1499} rows.`} title="Residual diagnostic · display-strided final test" tone="amber" x={predictionX} xLabel="Elapsed session time (s)" y={residuals} yLabel="Observed − predicted count" zeroLine /> : null}
            <ScatterChart data={dataset.derived.embedding} summary={dataset.accessibleSummaries.embedding} />
            <LineChart onCenter={centerInterval} summary={`Aggregated ${viewMode === "population" ? "population-mean" : selectedUnit} firing-rate trace. The aggregation interval is ${binSize} seconds and the trailing smoothing window spans ${smoothing} displayed bins. Tap, click, or use Left and Right Arrow to center the linked interval.`} title={`${viewMode === "population" ? "Population mean" : selectedUnit} firing rate · selected interval`} x={selectedSeries.x} xLabel="Time (s)" y={selectedSeries.y} yLabel="Firing rate (Hz)" />
          </div>
        </section>

        <aside aria-label="Scientific interpretation" className={styles.inspector}>
          <div className={styles.panelHead}><span className="mono">03</span><h2>Interpretation</h2></div>
          <span className="status-pill" data-tone={selectedModel.origin === "public-derived" ? "public" : "synthetic"}>{selectedModel.status}</span>
          <h3>{selectedModel.label}</h3>
          <dl className={styles.readouts}>
            <div><dt>Target</dt><dd>Next 100 ms t1c1 spike count (frozen model artifact)</dd></div>
            <div><dt>Inputs</dt><dd>Current x/y, trailing-only speed, and current-bin t1c1 count</dd></div>
            <div><dt>{selectedModel.metricLabel}</dt><dd>{selectedModel.metricValue === null ? "Not computed" : selectedModel.metricValue.toFixed(3)}</dd></div>
            <div><dt>Execution</dt><dd>{selectedModel.execution}</dd></div>
          </dl>
          {selectedModel.disclosure ? <p className="notice"><strong>Artifact status:</strong> {selectedModel.disclosure}</p> : null}
          <div className="notice">
            <strong>Do not rank by one number.</strong> Aligned metrics help compare held-out predictions, but model assumptions,
            calibration, interpretability, temporal leakage, and uncertainty determine whether a comparison is meaningful.
          </div>
          {showUncertainty ? (
            <p>
              The computed Stan artifact reports coefficient credible intervals, convergence diagnostics, posterior-mean
              predictions, a deterministic every-fifth-draw display sample, and a seeded held-out posterior predictive check. It does not ship every raw draw or a prior-sensitivity
              analysis. Credible and predictive intervals are conditional on the declared model and priors; they do not imply clinical certainty.
            </p>
          ) : null}
          {researchMode ? (
            <div className={styles.researchDetails}>
              <h3>Research diagnostics</h3>
              <ul>
                <li>Contiguous time folds with a temporal gap reduce autocorrelation leakage.</li>
                <li>Occupancy masks prevent sparsely sampled speed bins from looking precise.</li>
                <li>One 600-second, eight-unit session cannot establish population generality.</li>
                <li>Feature-map distances are descriptive, not anatomical or causal.</li>
              </ul>
            </div>
          ) : null}
          <pre aria-label="Code excerpt" tabIndex={0}><code>{`# Same frozen chronology across comparable models
train, validation, gap, test = blocked_time_split(features)

model.fit(train.X, train.y)
prediction = model.predict(test.X)`}</code></pre>
          <a className="button-secondary" href={`/tools/${model === "sklearn" ? "scikit-learn" : model}`}>Open model module</a>
        </aside>
      </div>

      <section aria-label="Timeline and provenance" className={styles.bottomPanel}>
        <div>
          <p className="eyebrow">Linked timeline</p>
          <h2>{start.toFixed(1)}–{end.toFixed(1)} seconds</h2>
          <p>The selected interval is encoded in the URL and restored on reload. Tap the raster or use the range controls to move it.</p>
        </div>
        <dl className={styles.provenance}>
          <div><dt>Dataset</dt><dd>{dataset.metadata.origin === "public-derived" ? `${dataset.metadata.datasetId} @ ${dataset.metadata.version}` : "Deterministic synthetic fallback"}</dd></div>
          <div><dt>Asset</dt><dd>{dataset.metadata.origin === "public-derived" ? dataset.metadata.assetPath : "No public source asset"}</dd></div>
          <div><dt>SHA-256</dt><dd><code>{dataset.metadata.origin === "public-derived" ? dataset.metadata.sha256 : "Synthetic runtime fixture"}</code></dd></div>
          <div><dt>License</dt><dd>{dataset.metadata.origin === "public-derived" ? dataset.metadata.license : "Project-generated; no external data license"}</dd></div>
          <div><dt>Origin</dt><dd>{dataset.metadata.origin}</dd></div>
          <div><dt>Browser work</dt><dd>filtering · smoothing · linked selection</dd></div>
        </dl>
        <div className="button-row"><a className="button-secondary" href="/data">View full provenance</a><a className="button-quiet" href="/methods">Read transformations</a></div>
      </section>
    </div>
  );
}
