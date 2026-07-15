"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { ToolSlug } from "../../lib/contracts";
import type { DemoDataset } from "../../lib/labData";
import { createSyntheticFallback, loadDemoDataset } from "../../lib/labData";
import { PlotlyFigure, type PlotlyFigureSpec } from "./PlotlyFigure";
import { TableScroll } from "./TableScroll";
import styles from "./ToolSignatureVisual.module.css";

type Props = { slug: ToolSlug; name: string };

type BridgeArtifact = {
  status: string;
  execution: string;
  disclosure: string;
  gradientCheck: { status: string; maxAbsoluteError: number };
  surface: { axis: number[]; logDensity: number[][]; gradientX: number[][]; gradientY: number[][] };
  optimizerTrace: { stepSize: number; steps: Array<{ step: number; theta: number[]; logDensity: number; gradient: number[] }> };
};

type PlenopticArtifact = {
  status: string;
  disclosure: string;
  model: { name: string; configuration: { standardDeviation: number } };
  synthesis: {
    checkpoints: Array<{ iteration: number; loss: number; png: { path: string; sha256: string } }>;
    finalLoss: number;
    pixelMse: number;
    representationMse: number;
    completedIterations: number;
    differencePng: { path: string };
    representationDifferencePng: { path: string };
  };
};

const codeLines = [
  "source_path = fetch_verified_source(allow_download=False)",
  "recording = extract_source_recording(source_path)",
  "artifact = build_public_artifact(recording)",
  "model_results = run_aligned_models(artifact, repo_root=repo_root, output_dir=output_dir)",
  "write_model_results(output_path, model_results)",
];

const notebookCells = [
  ["Markdown", "Project overview"],
  ["Code", "Environment information"],
  ["Code", "Dataset provenance"],
  ["Code", "NWB loading"],
  ["Code", "Data validation"],
  ["Code", "Pynapple conversion"],
  ["Code", "Exploratory analysis"],
  ["Code", "NeMoS model"],
  ["Code", "scikit-learn comparison"],
  ["Code", "PyTorch model"],
  ["Code", "Stan uncertainty example"],
  ["Output", "Plotly visualization"],
  ["Output", "Results"],
  ["Markdown", "Limitations"],
  ["Markdown", "Reproduction instructions"],
] as const;

const notebookCodePreviews = [
  "# One public recording · educational, nonclinical scope",
  'importlib.metadata.version("pynwb")',
  'assert public["metadata"]["sha256"] == EXPECTED_SOURCE_SHA256',
  "source_path = fetch_verified_source(allow_download=False)",
  "assert recording.schema_validation_errors == ()",
  "spikes = nap.TsGroup({index: nap.Ts(t=unit_events)})",
  'tuning_rate = np.asarray(public["derived"]["tuning"]["rate"])',
  "nemos_refit = fit_nemos(task)",
  "sklearn_refit = fit_sklearn(task)",
  "pytorch_refit = fit_pytorch(task)",
  'stan = model_results["models"]["stan"]',
  "figure = go.Figure()",
  'comparison = {name: lane["metricValue"] for name, lane in model_results["models"].items()}',
  "# One session does not establish generalization.",
  'commands = ["npm ci", "make verify PYTHON=.venv/bin/python"]',
] as const;

function sparkPath(values: number[], width = 420, height = 120, fixedMaximum?: number) {
  if (!values.length) return "";
  const min = fixedMaximum === undefined ? Math.min(...values) : 0;
  const max = fixedMaximum ?? Math.max(...values);
  return values.map((value, index) => {
    const x = 18 + index * ((width - 36) / Math.max(1, values.length - 1));
    const y = 10 + (1 - (value - min) / (max - min || 1)) * (height - 24);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function intervalBandPath(lower: number[], upper: number[], width = 440, height = 125) {
  if (!lower.length || lower.length !== upper.length) return "";
  const maximum = Math.max(1, ...upper);
  const point = (value: number, index: number) => {
    const x = 18 + index * ((width - 36) / Math.max(1, upper.length - 1));
    const y = 10 + (1 - value / maximum) * (height - 24);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };
  return `M${upper.map(point).join(" L")} L${lower.map(point).reverse().join(" L")} Z`;
}

function quantile(values: number[], probability: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return sorted[lower] + fraction * ((sorted[lower + 1] ?? sorted[lower]) - sorted[lower]);
}

function useArtifact<T>(path: string) {
  const [artifact, setArtifact] = useState<T | null | false>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(path, { cache: "force-cache", signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<T> : Promise.reject(new Error(`Artifact request failed: ${response.status}`)))
      .then(setArtifact)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setArtifact(false);
      });
    return () => controller.abort();
  }, [path]);
  return artifact;
}

function Disclosure({ origin, execution }: { origin: string; execution: string }) {
  return (
    <div className={styles.disclosure}>
      <span className="status-pill" data-tone={origin === "public-derived" || origin === "verified public source" ? "public" : origin === "synthetic" ? "synthetic" : "precomputed"}>{origin}</span>
      <span className="status-pill" data-tone="precomputed">{execution}</span>
      <span className="mono">artifact schema v1</span>
    </div>
  );
}

function PythonVisual({ dataset }: { dataset: DemoDataset }) {
  const [line, setLine] = useState(0);
  const nodes = ["NWB", "validate", "time series", "models", "web JSON"];
  return (
    <div className={styles.splitVisual}>
      <div className={styles.codeWalkthrough}>
        {codeLines.map((code, index) => <button aria-pressed={line === index} key={code} onFocus={() => setLine(index)} onMouseEnter={() => setLine(index)} onClick={() => setLine(index)} type="button"><span>{index + 1}</span><code>{code}</code></button>)}
      </div>
      <div className={styles.transformGraph} aria-label={`Selected code line ${line + 1} highlights ${nodes[line]}.`} role="img">
        {nodes.map((node, index) => <div data-active={index === line} key={node}><span className="mono">{String(index + 1).padStart(2, "0")}</span><strong>{node}</strong></div>)}
        <p>Line {line + 1}: {dataset.metadata.origin === "public-derived" ? "public artifact contract active" : "synthetic fallback contract active"}</p>
      </div>
    </div>
  );
}

function NotebookVisual() {
  const [cell, setCell] = useState(0);
  return (
    <div className={styles.notebookVisual}>
      <nav aria-label="Notebook cells">{notebookCells.map(([kind, title], index) => <button aria-pressed={cell === index} key={title} onClick={() => setCell(index)} type="button"><span>{kind}</span><strong>{title}</strong></button>)}</nav>
      <article aria-live="polite">
        <p className="eyebrow">Section {cell + 1} of 15 / executed in order</p>
        <h3>{notebookCells[cell][1]}</h3>
        {notebookCells[cell][0] === "Code" ? <pre aria-label="Notebook code preview" tabIndex={0}><code>{notebookCodePreviews[cell]}</code></pre> : <p>Each notebook section keeps its input artifact, version, execution status, and expected output beside the interpretation.</p>}
        <a className="button-secondary" href="/notebooks">Open read-only notebook preview</a>
      </article>
    </div>
  );
}

function PynappleVisual({ dataset }: { dataset: DemoDataset }) {
  const [panel, setPanel] = useState<"objects" | "spikes" | "tuning" | "correlation" | "flow">("spikes");
  const [unit, setUnit] = useState("t1c1");
  const [secondUnit, setSecondUnit] = useState("t2c1");
  const [epoch, setEpoch] = useState("first60");
  const [binWidth, setBinWidth] = useState(1);
  const [tuningBinCount, setTuningBinCount] = useState(12);
  const [lagWindow, setLagWindow] = useState(0.25);
  const [lagBinWidth, setLagBinWidth] = useState(0.01);
  const selected = dataset.units.find((candidate) => candidate.id === unit) ?? dataset.units[0];
  const second = dataset.units.find((candidate) => candidate.id === secondUnit) ?? dataset.units[1] ?? dataset.units[0];
  const bounds = epoch === "full" ? [0, dataset.metadata.durationSeconds] : epoch === "middle" ? [120, 180] : epoch === "late" ? [450, 510] : [0, 60];
  const [start, end] = bounds;

  const spikeSummary = useMemo(() => {
    const visible = selected.spikeTimes.filter((time) => time >= start && time < end);
    const count = Math.max(1, Math.ceil((end - start) / binWidth));
    const rates = Array.from({ length: count }, () => 0);
    visible.forEach((time) => { const index = Math.min(count - 1, Math.floor((time - start) / binWidth)); rates[index] += 1 / binWidth; });
    const markStride = Math.max(1, Math.ceil(visible.length / 700));
    const displayed = visible.filter((_, index) => index % markStride === 0);
    return { visible, displayed, markStride, rates };
  }, [selected, start, end, binWidth]);

  const tuning = useMemo(() => {
    const speeds = dataset.position.speed;
    // Match the offline artifact method: clip the display range at the 99th
    // percentile so one extreme sample does not determine every bin edge.
    const maximum = Math.max(0.001, quantile(speeds, 0.99));
    const occupancy = Array.from({ length: tuningBinCount }, () => 0);
    const spikeCounts = Array.from({ length: tuningBinCount }, () => 0);
    const interval = dataset.metadata.positionSampleIntervalSeconds || 0.1;
    speeds.forEach((speed) => { occupancy[Math.min(tuningBinCount - 1, Math.floor((speed / maximum) * tuningBinCount))] += interval; });
    selected.spikeTimes.forEach((time) => {
      const rawIndex = (time - (dataset.position.timestamps[0] ?? 0)) / interval;
      const lower = Math.min(dataset.position.timestamps.length - 1, Math.max(0, Math.floor(rawIndex)));
      const upper = Math.min(dataset.position.timestamps.length - 1, lower + 1);
      const fraction = Math.min(1, Math.max(0, rawIndex - lower));
      const speed = (speeds[lower] ?? 0) * (1 - fraction) + (speeds[upper] ?? speeds[lower] ?? 0) * fraction;
      spikeCounts[Math.min(tuningBinCount - 1, Math.floor((speed / maximum) * tuningBinCount))] += 1;
    });
    const rate = occupancy.map((seconds, index) => seconds > 0 ? spikeCounts[index] / seconds : 0);
    const centers = rate.map((_, index) => (index + 0.5) * maximum / tuningBinCount);
    return { occupancy, rate, centers };
  }, [dataset, selected, tuningBinCount]);

  const correlation = useMemo(() => {
    const binCount = Math.max(1, Math.ceil((2 * lagWindow) / lagBinWidth));
    const counts = Array.from({ length: binCount }, () => 0);
    let left = 0;
    let right = 0;
    for (let firstIndex = 0; firstIndex < selected.spikeTimes.length; firstIndex += 1) {
      const firstSpike = selected.spikeTimes[firstIndex];
      while (left < second.spikeTimes.length && second.spikeTimes[left] < firstSpike - lagWindow) left += 1;
      right = Math.max(right, left);
      while (right < second.spikeTimes.length && second.spikeTimes[right] <= firstSpike + lagWindow) right += 1;
      for (let index = left; index < right; index += 1) {
        // A spike must not be paired with itself when the same unit is selected
        // on both sides; other same-unit event pairs remain valid.
        if (selected.id === second.id && index === firstIndex) continue;
        const lag = second.spikeTimes[index] - firstSpike;
        const bin = Math.min(binCount - 1, Math.floor((lag + lagWindow) / lagBinWidth));
        if (bin >= 0) counts[bin] += 1;
      }
    }
    return { counts, centers: counts.map((_, index) => -lagWindow + (index + 0.5) * lagBinWidth) };
  }, [selected, second, lagWindow, lagBinWidth]);

  return (
    <div className={styles.pynappleVisual}>
      <nav aria-label="Pynapple demonstrations" className={styles.pynappleTabs}>{(["objects", "spikes", "tuning", "correlation", "flow"] as const).map((id) => <button aria-pressed={panel === id} key={id} onClick={() => setPanel(id)} type="button">{id === "objects" ? "Objects" : id === "spikes" ? "Spikes + epochs" : id === "tuning" ? "Tuning" : id === "correlation" ? "Correlation" : "NWB flow"}</button>)}</nav>

      {panel === "objects" ? <div className={styles.objectExplorer}><dl><div><dt>Time support</dt><dd>0–{dataset.metadata.durationSeconds} s</dd></div><div><dt>Position object</dt><dd>{dataset.position.timestamps.length.toLocaleString()} timestamps · x/y/speed</dd></div><div><dt>Spike group</dt><dd>{dataset.units.length} unit-keyed event series</dd></div><div><dt>Selected unit</dt><dd>{unit} · {selected.spikeTimes.length.toLocaleString()} spikes</dd></div></dl><label>Inspect unit <select onChange={(event) => setUnit(event.target.value)} value={unit}>{dataset.metadata.unitIds.map((id) => <option key={id}>{id}</option>)}</select></label><p className="notice">These browser objects mirror the declared time-support contract. The executed Python lane independently verifies t1c1 counts with Pynapple 0.11.3; the browser does not claim to run Python.</p></div> : null}

      {panel === "spikes" ? <div><div className={styles.visualControls}><label>Unit <select onChange={(event) => setUnit(event.target.value)} value={unit}>{dataset.metadata.unitIds.map((id) => <option key={id}>{id}</option>)}</select></label><label>Epoch <select onChange={(event) => setEpoch(event.target.value)} value={epoch}><option value="first60">0–60 s</option><option value="middle">120–180 s</option><option value="late">450–510 s</option><option value="full">Full support</option></select></label><label>Rate bin <select onChange={(event) => setBinWidth(Number(event.target.value))} value={binWidth}><option value="0.1">100 ms</option><option value="0.5">500 ms</option><option value="1">1 s</option><option value="2">2 s</option></select></label></div><svg aria-label={`${spikeSummary.visible.length} spikes from ${unit} in the ${start} to ${end} second epoch. Mean rate ${(spikeSummary.visible.length / (end - start)).toFixed(3)} hertz. ${spikeSummary.markStride > 1 ? `The raster displays every ${spikeSummary.markStride}th spike to stay legible; counts and the rate trace use all spikes.` : "Every spike is displayed."} The lower trace shows rates in ${binWidth}-second bins.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 160"><rect fill="var(--teal-wash)" height="58" width="396" x="24" y="18" />{spikeSummary.displayed.map((time, index) => <line key={`${time}-${index}`} stroke="var(--teal)" strokeWidth="1.2" x1={24 + ((time - start) / (end - start)) * 396} x2={24 + ((time - start) / (end - start)) * 396} y1="28" y2="66" />)}<path d={sparkPath(spikeSummary.rates, 420, 64)} fill="none" stroke="var(--amber)" strokeWidth="2" transform="translate(0 78)" /><text className={styles.svgLabel} x="24" y="150">{spikeSummary.visible.length} spikes · {(spikeSummary.visible.length / (end - start)).toFixed(3)} Hz · {spikeSummary.markStride > 1 ? `every ${spikeSummary.markStride}th mark shown` : "all marks shown"}</text></svg><details><summary>Inspect representative rate bins</summary><TableScroll label="Scrollable representative Pynapple rate bins"><table><caption>Up to 20 evenly spaced bins from the selected epoch. Counts and rates use every spike even when the raster deterministically thins visible marks.</caption><thead><tr><th scope="col">Bin start (s)</th><th scope="col">Firing rate (Hz)</th></tr></thead><tbody>{spikeSummary.rates.filter((_, index) => index % Math.max(1, Math.ceil(spikeSummary.rates.length / 20)) === 0).map((rate, row) => { const index = row * Math.max(1, Math.ceil(spikeSummary.rates.length / 20)); return <tr key={index}><th scope="row">{(start + index * binWidth).toFixed(3)}</th><td>{rate.toFixed(4)}</td></tr>; })}</tbody></table></TableScroll></details></div> : null}

      {panel === "tuning" ? <div><div className={styles.visualControls}><label>Unit <select onChange={(event) => setUnit(event.target.value)} value={unit}>{dataset.metadata.unitIds.map((id) => <option key={id}>{id}</option>)}</select></label><label>Speed bins <select onChange={(event) => setTuningBinCount(Number(event.target.value))} value={tuningBinCount}><option value="8">8</option><option value="12">12</option><option value="16">16</option><option value="20">20</option></select></label></div><svg aria-label={`Client-derived occupancy-aware descriptive speed tuning for ${unit} using ${tuningBinCount} bins. Occupancy and spike counts are recomputed from the active ${dataset.metadata.origin} artifact.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 160"><path d={sparkPath(tuning.rate, 420, 112)} fill="none" stroke="var(--teal)" strokeWidth="3" /><path d={sparkPath(tuning.occupancy, 420, 112)} fill="none" stroke="var(--amber)" strokeDasharray="6 4" strokeWidth="2" /><text className={styles.svgLabel} x="24" y="148">solid: firing rate (Hz) · dashed: occupancy (s) · descriptive only</text></svg><p className="fine-print">This bounded browser view recomputes occupancy, clips the displayed speed range at the 99th percentile, and linearly interpolates the descriptive 100 ms speed trace at each spike time—the same method declared by the offline artifact—while allowing a different unit or bin count.</p><details><summary>Inspect tuning values</summary><TableScroll label="Scrollable Pynapple tuning values"><table><caption>Every client-derived speed bin for {unit}.</caption><thead><tr><th scope="col">Speed center (m/s)</th><th scope="col">Rate (Hz)</th><th scope="col">Occupancy (s)</th></tr></thead><tbody>{tuning.centers.map((center, index) => <tr key={center}><th scope="row">{center.toFixed(4)}</th><td>{tuning.rate[index].toFixed(4)}</td><td>{tuning.occupancy[index].toFixed(2)}</td></tr>)}</tbody></table></TableScroll></details></div> : null}

      {panel === "correlation" ? <div><div className={styles.visualControls}><label>First unit <select onChange={(event) => setUnit(event.target.value)} value={unit}>{dataset.metadata.unitIds.map((id) => <option key={id}>{id}</option>)}</select></label><label>Second unit <select onChange={(event) => setSecondUnit(event.target.value)} value={secondUnit}>{dataset.metadata.unitIds.map((id) => <option key={id}>{id}</option>)}</select></label><label>Lag window <select onChange={(event) => setLagWindow(Number(event.target.value))} value={lagWindow}><option value="0.1">±100 ms</option><option value="0.25">±250 ms</option><option value="0.5">±500 ms</option></select></label><label>Lag bin <select onChange={(event) => setLagBinWidth(Number(event.target.value))} value={lagBinWidth}><option value="0.005">5 ms</option><option value="0.01">10 ms</option><option value="0.025">25 ms</option></select></label></div><svg aria-label={`Client-derived event-pair lag histogram for ${unit} and ${secondUnit}, from minus to plus ${lagWindow} seconds in ${lagBinWidth}-second bins. A same-unit selection excludes each event's self-pair. It does not establish connectivity.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 160"><path d={sparkPath(correlation.counts, 420, 120)} fill="none" stroke="var(--violet)" strokeWidth="2.5" /><line stroke="var(--line-strong)" strokeDasharray="4 3" x1="220" x2="220" y1="10" y2="130" /><text className={styles.svgLabel} x="24" y="150">event-pair count by lag · self-pairs excluded · no connectivity claim</text></svg><details><summary>Inspect correlation values</summary><TableScroll label="Scrollable Pynapple lag-bin values"><table><caption>Every lag bin for {unit} versus {secondUnit}; identical-event self-pairs are excluded when the same unit is selected.</caption><thead><tr><th scope="col">Lag center (s)</th><th scope="col">Event-pair count</th></tr></thead><tbody>{correlation.centers.map((center, index) => <tr key={center}><th scope="row">{center.toFixed(4)}</th><td>{correlation.counts[index]}</td></tr>)}</tbody></table></TableScroll></details></div> : null}

      {panel === "flow" ? <div className={styles.transformGraph} aria-label="Verified NWB-to-Pynapple data contract." role="img">{["NWB Units", "TsGroup", "SpatialSeries LED1", "TsdFrame", "explicit IntervalSet"].map((node, index) => <div data-active key={node}><span className="mono">{String(index + 1).padStart(2, "0")}</span><strong>{node}</strong></div>)}<p>Executed check: Pynapple 0.11.3 t1c1 100 ms counts equal the NumPy target vector before the next-bin shift.</p></div> : null}
    </div>
  );
}

function NemosVisual({ dataset }: { dataset: DemoDataset }) {
  const model = dataset.models.nemos;
  const names = ["x position", "y position", "trailing speed", "current t1c1 count"];
  const coefficients = model?.coefficients ?? [];
  const basisConfigurations = model?.basisExplorer?.configurations ?? [];
  const [selected, setSelected] = useState(0);
  const [basisId, setBasisId] = useState("");
  const [view, setView] = useState<"basis" | "coefficients" | "predictions" | "residuals" | "mechanism">("basis");
  const basis = basisConfigurations.find((configuration) => configuration.id === basisId) ?? basisConfigurations[0];
  if (!model?.artifactAvailable || coefficients.length !== names.length) return <p className="notice"><strong>Computed artifact unavailable.</strong> The synthetic fallback does not invent NeMoS coefficients or performance.</p>;
  return (
    <div className={styles.nemosVisual}>
      <div className={styles.visualControls}>
        <label>Target <select disabled value="t1c1"><option>t1c1 next-bin count</option></select></label>
        <label>Workbench view <select onChange={(event) => setView(event.target.value as "basis" | "coefficients" | "predictions" | "residuals" | "mechanism")} value={view}><option value="basis">Basis design explorer</option><option value="coefficients">Fitted coefficients</option><option value="predictions">Held-out prediction</option><option value="residuals">Held-out residuals</option><option value="mechanism">How the model thinks</option></select></label>
        {view === "basis" && basis ? <label>Basis type and count <select onChange={(event) => setBasisId(event.target.value)} value={basis.id}>{basisConfigurations.map((configuration) => <option key={configuration.id} value={configuration.id}>{configuration.basisType.replace("Eval", "")} · {configuration.nBasisFunctions}</option>)}</select></label> : null}
        {view === "coefficients" ? <label>Inspect coefficient <select onChange={(event) => setSelected(Number(event.target.value))} value={selected}>{names.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label> : null}
        <span className="mono">frozen fit · ridge λ={String(model.configuration?.regularizerStrength ?? "recorded")}</span>
      </div>
      {view === "basis" && basis ? <>
        <svg aria-label={`${basis.basisType} basis design with ${basis.nBasisFunctions} functions evaluated over normalized input zero to one. This version-locked explorer was generated by NeMoS but was not used in the frozen raw-feature fit.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 150">
          <line stroke="var(--line-strong)" x1="18" x2="420" y1="122" y2="122" />
          {basis.curves.map((curve, index) => <path d={sparkPath(curve.values, 420, 124, 1)} fill="none" key={curve.feature} stroke={["var(--teal)", "var(--blue)", "var(--violet)", "var(--amber)", "var(--rose)"][index % 5]} strokeWidth="2" />)}
          <text className={styles.svgLabel} x="24" y="144">normalized input · {basis.nBasisFunctions} computed basis columns</text>
        </svg>
        <TableScroll label="Scrollable NeMoS basis design-matrix sample"><table><caption>Five actual rows from the selected NeMoS basis evaluation. The explorer is separate from the four-column frozen model fit.</caption><thead><tr><th scope="col">Input</th>{basis.featureNames.map((name) => <th key={name} scope="col">{name.split(":").at(-1)}</th>)}</tr></thead><tbody>{basis.designMatrixSample.rows.map((row, rowIndex) => <tr key={basis.designMatrixSample.input[rowIndex]}><th scope="row">{basis.designMatrixSample.input[rowIndex].toFixed(2)}</th>{row.map((value, index) => <td key={index}>{value.toFixed(4)}</td>)}</tr>)}</tbody></table></TableScroll>
        <p className="fine-print">{model.basisExplorer?.disclosure}</p>
      </> : view === "coefficients" ? <>
        <div className={styles.matrix} aria-label="Schematic four-column raw-feature matrix: current x, current y, trailing-only speed, and current-bin t1c1 count. The highlighted column follows the coefficient control." role="img">{Array.from({ length: 32 }, (_, index) => <i key={index} style={{ opacity: 0.2 + (index % 4 === selected ? 0.68 : 0.1) }} />)}</div>
        <svg aria-label={`Four fitted standardized NeMoS coefficients: ${names.map((name, index) => `${name} ${coefficients[index].toFixed(4)}`).join(", ")}. ${names[selected]} is selected.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 140">
        <line stroke="var(--line-strong)" x1="24" x2="420" y1="70" y2="70" />
        {coefficients.map((value, index) => <rect fill={index === selected ? "var(--amber)" : value >= 0 ? "var(--teal)" : "var(--rose)"} height={Math.abs(value) * 105} key={names[index]} opacity={index === selected ? 1 : .68} width="56" x={66 + index * 88} y={value >= 0 ? 70 - value * 105 : 70} />)}
        <text className={styles.svgLabel} x="24" y="126">Selected: {names[selected]} = {coefficients[selected].toFixed(4)} standardized log-rate units</text>
        </svg>
        <TableScroll label="Scrollable fitted NeMoS coefficients"><table><caption>All four training-standardized NeMoS coefficients.</caption><thead><tr><th scope="col">Feature</th><th scope="col">Coefficient</th></tr></thead><tbody>{names.map((name, index) => <tr key={name}><th scope="row">{name}</th><td>{coefficients[index].toFixed(6)}</td></tr>)}</tbody></table></TableScroll>
      </> : view === "predictions" ? (() => { const maximum = Math.max(1, ...model.observed, ...model.predicted); return <><svg aria-label={`Display-strided final-test observed and predicted t1c1 next-bin counts for NeMoS. Solid is observed and dashed is predicted. Mean Poisson deviance ${model.metricValue?.toFixed(6)} uses all ${model.heldOutSampleCount} held-out rows.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 140"><path d={sparkPath(model.observed, 440, 112, maximum)} fill="none" stroke="var(--ink)" strokeWidth="2" /><path d={sparkPath(model.predicted, 440, 112, maximum)} fill="none" stroke="var(--teal)" strokeDasharray="6 4" strokeWidth="2.2" /><text className={styles.svgLabel} x="24" y="130">solid observed · dashed predicted · every {model.displayStride}th test row shown</text></svg><TableScroll label="Scrollable held-out NeMoS predictions"><table><caption>Up to 20 evenly spaced points from the display-strided final-test trace.</caption><thead><tr><th scope="col">Displayed index</th><th scope="col">Observed</th><th scope="col">Predicted</th></tr></thead><tbody>{model.observed.filter((_, index) => index % Math.max(1, Math.ceil(model.observed.length / 20)) === 0).map((value, row) => { const index = row * Math.max(1, Math.ceil(model.observed.length / 20)); return <tr key={index}><th scope="row">{index}</th><td>{value.toFixed(4)}</td><td>{model.predicted[index].toFixed(4)}</td></tr>; })}</tbody></table></TableScroll></>; })() : view === "residuals" ? (() => { const residuals = model.observed.map((value, index) => value - model.predicted[index]); const maximum = Math.max(1, ...residuals.map(Math.abs)); const shiftedResiduals = residuals.map((value) => value + maximum); return <><svg aria-label={`Display-strided final-test residuals for NeMoS, defined as observed minus predicted t1c1 count. The metric uses all ${model.heldOutSampleCount} rows.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 140"><line stroke="var(--line-strong)" x1="18" x2="422" y1="54" y2="54" /><path d={sparkPath(shiftedResiduals, 440, 112, maximum * 2)} fill="none" stroke="var(--rose)" strokeWidth="2" /><text className={styles.svgLabel} x="24" y="130">observed − predicted count · display stride {model.displayStride}</text></svg><TableScroll label="Scrollable held-out NeMoS residuals"><table><caption>Representative display-strided residuals; positive values indicate underprediction.</caption><thead><tr><th scope="col">Displayed index</th><th scope="col">Observed</th><th scope="col">Predicted</th><th scope="col">Residual</th></tr></thead><tbody>{residuals.filter((_, index) => index % Math.max(1, Math.ceil(residuals.length / 20)) === 0).map((residual, row) => { const index = row * Math.max(1, Math.ceil(residuals.length / 20)); return <tr key={index}><th scope="row">{index}</th><td>{model.observed[index].toFixed(4)}</td><td>{model.predicted[index].toFixed(4)}</td><td>{residual.toFixed(4)}</td></tr>; })}</tbody></table></TableScroll></>; })() : <div className={styles.transformGraph} aria-label="NeMoS model path: current behavioral and spike-count features, training-only standardization, weighted sum, exponential inverse link, and predicted next-bin t1c1 count." role="img">{["Current x/y + trailing speed + current count", "Training-only standardization", "Weighted sum Xβ + intercept", "Exponential inverse link", "Predicted next-bin count"].map((node, index) => <div data-active key={node}><span className="mono">{String(index + 1).padStart(2, "0")}</span><strong>{node}</strong></div>)}<p>Frozen fit: train [0,3600) · validation reported · gap [4200,4500) · final test [4500,5999) · LBFGS, at most {String(model.configuration?.maximumIterations ?? 500)} iterations.</p></div>}
      <p className="fine-print">Actually fit offline with NeMoS/JAX on the frozen training block. The browser inspects the checksummed coefficients; it does not refit the model. Final-test mean Poisson deviance: {model.metricValue?.toFixed(6)}.</p>
    </div>
  );
}

function PlenopticVisual() {
  const artifact = useArtifact<PlenopticArtifact>("/artifacts/v1/plenoptic-demo.json?sha=dec853e652b90a29");
  const [checkpoint, setCheckpoint] = useState(0);
  const [differenceMode, setDifferenceMode] = useState<"pixel" | "representation">("pixel");
  if (artifact === false) return <p className="notice"><strong>Plenoptic artifact unavailable.</strong> No synthesis or loss is substituted. Reproduce it locally from the documented generator.</p>;
  if (!artifact) return <p className="notice">Loading the checksummed plenoptic artifact…</p>;
  const checkpoints = artifact.synthesis.checkpoints;
  const active = checkpoints[Math.min(checkpoint, checkpoints.length - 1)];
  const logLoss = checkpoints.map((entry) => Math.log10(entry.loss));
  const minLogLoss = Math.min(...logLoss);
  const maxLogLoss = Math.max(...logLoss);
  const checkpointX = 18 + checkpoint * (384 / Math.max(1, checkpoints.length - 1));
  const checkpointY = 10 + (1 - (logLoss[checkpoint] - minLogLoss) / (maxLogLoss - minLogLoss || 1)) * 96;
  const checkpointSource = active.png.path.replace("./", "/artifacts/v1/");
  const differenceSource = (differenceMode === "pixel" ? artifact.synthesis.differencePng.path : artifact.synthesis.representationDifferencePng.path).replace("./", "/artifacts/v1/");
  return (
    <div>
      <label className={styles.rangeLabel}>Recorded checkpoint: iteration {active.iteration}, representation loss {active.loss.toExponential(3)} <input max={checkpoints.length - 1} min="0" onChange={(event) => setCheckpoint(Number(event.target.value))} type="range" value={checkpoint} /></label>
      <div className={styles.visualControls}><span className="mono">Computed progress frame {checkpoint + 1}/{checkpoints.length}</span><div><button aria-pressed={differenceMode === "pixel"} onClick={() => setDifferenceMode("pixel")} type="button">Pixel difference</button><button aria-pressed={differenceMode === "representation"} onClick={() => setDifferenceMode("representation")} type="button">Representation difference</button></div></div>
      <div className={styles.imageCompare}>
        <figure><Image alt="Deterministic procedural grayscale source image used by the plenoptic demonstration." height={240} src="/artifacts/v1/plenoptic-source.png" width={240} /><figcaption>Procedural source</figcaption></figure>
        <figure><Image alt={`Precomputed plenoptic synthesis progress frame at iteration ${active.iteration}.`} height={240} src={checkpointSource} width={240} /><figcaption>Synthesis · iteration {active.iteration}</figcaption></figure>
        <figure><Image alt={differenceMode === "pixel" ? "Signed pixel difference between the procedural source and final synthesis, display-scaled around mid-gray." : "Signed Gaussian-model representation difference between the procedural source and final synthesis, display-scaled around mid-gray."} height={240} src={differenceSource} width={240} /><figcaption>Display-scaled {differenceMode} difference</figcaption></figure>
      </div>
      <svg aria-label={`Recorded plenoptic optimization history from iteration zero loss ${checkpoints[0].loss.toExponential(3)} to iteration ${checkpoints.at(-1)?.iteration} loss ${checkpoints.at(-1)?.loss.toExponential(3)}. Selected iteration ${active.iteration}, loss ${active.loss.toExponential(3)}.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 140"><path d={sparkPath(logLoss, 420, 112)} fill="none" stroke="var(--violet)" strokeWidth="2.5" /><circle cx={checkpointX} cy={checkpointY} fill="var(--amber)" r="6" /><text className={styles.svgLabel} x="24" y="130">log10 representation loss · selected iteration {active.iteration}</text></svg>
      <details><summary>Inspect every recorded optimization checkpoint</summary><TableScroll label="Scrollable plenoptic optimization checkpoints"><table><caption>Deterministic plenoptic Metamer representation loss.</caption><thead><tr><th scope="col">Iteration</th><th scope="col">Representation loss</th></tr></thead><tbody>{checkpoints.map((entry) => <tr key={entry.iteration}><th scope="row">{entry.iteration}</th><td>{entry.loss.toExponential(6)}</td></tr>)}</tbody></table></TableScroll></details>
      <p className="notice"><strong>Interpretation:</strong> this is a real deterministic <code>{artifact.model.name}</code> synthesis with σ={artifact.model.configuration.standardDeviation}. Final representation loss is {artifact.synthesis.finalLoss.toExponential(3)}, representation MSE is {artifact.synthesis.representationMse.toExponential(3)}, and pixel MSE is {artifact.synthesis.pixelMse.toFixed(6)}. Model-representation similarity does not establish human perceptual equivalence.</p>
    </div>
  );
}

function StanVisual({ dataset }: { dataset: DemoDataset }) {
  const artifact = dataset.models.stan;
  const posterior = artifact?.posteriorSummary ?? [];
  const posteriorSamples = artifact?.posteriorDrawSamples;
  const predictive = artifact?.posteriorPredictiveCheck;
  const [parameter, setParameter] = useState(0);
  const [priorWidth, setPriorWidth] = useState(1);
  const [view, setView] = useState<"interval" | "distribution" | "predictive" | "prior">("interval");
  if (!artifact?.artifactAvailable || !posterior.length) return <p className="notice"><strong>Posterior artifact unavailable.</strong> The fallback does not fabricate draws, intervals, or diagnostics.</p>;
  const active = posterior[Math.min(parameter, posterior.length - 1)];
  const allBounds = posterior.flatMap((entry) => [entry.q05, entry.q95]);
  const min = Math.min(...allBounds);
  const max = Math.max(...allBounds);
  const x = (value: number) => 34 + ((value - min) / (max - min || 1)) * 372;
  const priorX = Array.from({ length: 81 }, (_, index) => -4 + index * 0.1);
  const priorY = priorX.map((value) => Math.exp(-0.5 * (value / priorWidth) ** 2) / (priorWidth * Math.sqrt(2 * Math.PI)));
  const activeDrawSample = posteriorSamples?.parameters.find((entry) => entry.parameter === active.parameter);
  const drawHistogram = (() => {
    const values = activeDrawSample?.values ?? [];
    if (!values.length) return { counts: [] as number[], centers: [] as number[], minimum: 0, maximum: 1 };
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const width = (maximum - minimum || 1) / 24;
    const counts = Array.from({ length: 24 }, () => 0);
    values.forEach((value) => { counts[Math.min(counts.length - 1, Math.floor((value - minimum) / width))] += 1; });
    return { counts, centers: counts.map((_, index) => minimum + (index + 0.5) * width), minimum, maximum };
  })();
  const drawMedianX = 18 + ((active.median - drawHistogram.minimum) / (drawHistogram.maximum - drawHistogram.minimum || 1)) * 404;
  return (
    <div>
      <div className={styles.visualControls}>
        <label>View <select onChange={(event) => setView(event.target.value as "interval" | "distribution" | "predictive" | "prior")} value={view}><option value="interval">Coefficient interval</option><option value="distribution">Posterior distribution</option><option value="predictive">Posterior predictive check</option><option value="prior">Safe prior scenario</option></select></label>
        {view === "interval" || view === "distribution" ? <label>Posterior parameter <select onChange={(event) => setParameter(Number(event.target.value))} value={parameter}>{posterior.map((entry, index) => <option key={entry.parameter} value={index}>{entry.parameter}</option>)}</select></label> : null}
        {view === "prior" ? <label>Illustrative β prior width · {priorWidth.toFixed(1)}<input max="2" min="0.5" onChange={(event) => setPriorWidth(Number(event.target.value))} step="0.25" type="range" value={priorWidth} /></label> : null}
        <span className="mono">R-hat {active.rHat.toFixed(4)} · bulk ESS {active.essBulk.toFixed(0)}</span>
      </div>
      {view === "interval" ? <svg aria-label={`${active.parameter}: posterior median ${active.median.toFixed(4)}, 90 percent credible interval ${active.q05.toFixed(4)} to ${active.q95.toFixed(4)}, R-hat ${active.rHat.toFixed(4)}, bulk effective sample size ${active.essBulk.toFixed(0)}.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 160">
        <line stroke="var(--line-strong)" x1="34" x2="406" y1="76" y2="76" />
        <line stroke="var(--violet)" strokeWidth="8" x1={x(active.q05)} x2={x(active.q95)} y1="76" y2="76" />
        <circle cx={x(active.median)} cy="76" fill="var(--amber)" r="8" />
        <text className={styles.svgLabel} x="34" y="40">90% CrI [{active.q05.toFixed(3)}, {active.q95.toFixed(3)}]</text>
        <text className={styles.svgLabel} x="24" y="145">Computed coefficient interval · not a confidence interval</text>
      </svg> : view === "distribution" && activeDrawSample ? <>
        <svg aria-label={`${active.parameter} empirical posterior distribution from ${activeDrawSample.values.length} deterministically strided actual post-warmup draws. The source fit contains ${posteriorSamples?.sourceDrawCount} draws; summary diagnostics use all of them.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 160"><path d={sparkPath(drawHistogram.counts, 440, 125)} fill="none" stroke="var(--violet)" strokeWidth="3" /><line stroke="var(--amber)" strokeDasharray="5 3" strokeWidth="2" x1={drawMedianX} x2={drawMedianX} y1="14" y2="128" /><text className={styles.svgLabel} x="24" y="145">empirical histogram · {activeDrawSample.values.length} actual display draws · median {active.median.toFixed(4)}</text></svg>
        <p className="notice"><strong>Distribution scope:</strong> {posteriorSamples?.disclosure}</p>
      </> : view === "predictive" && predictive ? <>
        <svg aria-label={`Held-out posterior predictive check from ${predictive.posteriorDrawCount} actual posterior draws and deterministic Poisson simulations. The central 90 percent predictive interval covers ${(predictive.intervalCoverage.rate * 100).toFixed(1)} percent of ${predictive.heldOutSampleCount} held-out rows. Observed total ${predictive.totalCount.observed} is outside the predictive total-count interval ${predictive.totalCount.q05.toFixed(1)} to ${predictive.totalCount.q95.toFixed(1)}.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 160">
          <path d={intervalBandPath(predictive.predictiveCountQ05, predictive.predictiveCountQ95)} fill="var(--violet-wash)" opacity="0.8" />
          <path d={sparkPath(predictive.predictiveCountMedian, 440, 125, Math.max(1, ...predictive.predictiveCountQ95))} fill="none" stroke="var(--violet)" strokeDasharray="6 4" strokeWidth="2" />
          <path d={sparkPath(artifact.observed, 440, 125, Math.max(1, ...predictive.predictiveCountQ95))} fill="none" stroke="var(--ink)" strokeWidth="1.8" />
          <text className={styles.svgLabel} x="24" y="145">band: 90% predictive interval · solid: observed · dashed: predictive median</text>
        </svg>
        <p className="notice"><strong>Predictive discrepancy:</strong> observed held-out total {predictive.totalCount.observed} is below the model’s central predictive total interval [{predictive.totalCount.q05.toFixed(1)}, {predictive.totalCount.q95.toFixed(1)}]. This flags lack of fit; it is not hidden by the row-wise coverage of {(predictive.intervalCoverage.rate * 100).toFixed(1)}%.</p>
      </> : <>
        <svg aria-label={`Client-derived normal prior density scenario with mean zero and standard deviation ${priorWidth.toFixed(2)}. Moving this control does not resample or alter the stored posterior.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 160"><path d={sparkPath(priorY, 440, 125)} fill="none" stroke="var(--blue)" strokeWidth="3" /><text className={styles.svgLabel} x="24" y="145">Normal(0, {priorWidth.toFixed(2)}) β prior · shape preview only</text></svg>
        <p className="notice"><strong>Safe scenario boundary:</strong> this control recomputes only the prior density curve in the browser. The reviewed Stan fit uses Normal(0, 1) for β; changing the preview does not claim a new posterior result.</p>
      </>}
      {view === "interval" ? <TableScroll label="Scrollable Stan posterior summaries"><table><caption>Every computed Stan posterior coefficient summary.</caption><thead><tr><th scope="col">Parameter</th><th scope="col">Median</th><th scope="col">90% CrI</th><th scope="col">R-hat</th><th scope="col">Bulk ESS</th></tr></thead><tbody>{posterior.map((entry) => <tr key={entry.parameter}><th scope="row">{entry.parameter}</th><td>{entry.median.toFixed(5)}</td><td>[{entry.q05.toFixed(5)}, {entry.q95.toFixed(5)}]</td><td>{entry.rHat.toFixed(5)}</td><td>{entry.essBulk.toFixed(1)}</td></tr>)}</tbody></table></TableScroll> : view === "distribution" && activeDrawSample ? <TableScroll label="Scrollable Stan posterior histogram bins"><table><caption>Every empirical histogram bin for the selected parameter’s actual display draws.</caption><thead><tr><th scope="col">Coefficient-bin center</th><th scope="col">Draw count</th></tr></thead><tbody>{drawHistogram.centers.map((center, index) => <tr key={center}><th scope="row">{center.toFixed(6)}</th><td>{drawHistogram.counts[index]}</td></tr>)}</tbody></table></TableScroll> : view === "predictive" && predictive ? <TableScroll label="Scrollable Stan posterior predictive values"><table><caption>Representative display-strided posterior predictive rows; intervals come from actual posterior draws and seeded count simulations.</caption><thead><tr><th scope="col">Test row</th><th scope="col">Observed</th><th scope="col">5th percentile</th><th scope="col">Median</th><th scope="col">95th percentile</th></tr></thead><tbody>{predictive.displayRows.filter((_, index) => index % Math.max(1, Math.ceil(predictive.displayRows.length / 20)) === 0).map((rowValue, displayIndex) => { const index = displayIndex * Math.max(1, Math.ceil(predictive.displayRows.length / 20)); return <tr key={rowValue}><th scope="row">{rowValue}</th><td>{artifact.observed[index]?.toFixed(0)}</td><td>{predictive.predictiveCountQ05[index]?.toFixed(2)}</td><td>{predictive.predictiveCountMedian[index]?.toFixed(2)}</td><td>{predictive.predictiveCountQ95[index]?.toFixed(2)}</td></tr>; })}</tbody></table></TableScroll> : null}
      <p className="fine-print">CmdStan {artifact.software?.cmdstan}; zero divergent transitions; maximum R-hat {artifact.diagnostics?.maxRHat?.toFixed(5)}. Posterior and predictive intervals are conditional on the declared model and priors.</p>
    </div>
  );
}

function BridgeStanVisual() {
  const artifact = useArtifact<BridgeArtifact>("/artifacts/v1/bridgestan-surface.json?sha=1b7a465368d9b5c3");
  const [xIndex, setXIndex] = useState(8);
  const [yIndex, setYIndex] = useState(8);
  const [optimizerStep, setOptimizerStep] = useState(0);
  if (artifact === false) return <p className="notice"><strong>BridgeStan artifact unavailable.</strong> No density or gradient is substituted. Reproduce it locally from the documented generator.</p>;
  if (!artifact) return <p className="notice">Loading the checksummed BridgeStan surface…</p>;
  const axis = artifact.surface.axis;
  const theta1 = axis[xIndex];
  const theta2 = axis[yIndex];
  const logp = artifact.surface.logDensity[yIndex][xIndex];
  const gradient = [artifact.surface.gradientX[yIndex][xIndex], artifact.surface.gradientY[yIndex][xIndex]];
  const densityValues = artifact.surface.logDensity.flat();
  const densityMin = Math.min(...densityValues);
  const densityMax = Math.max(...densityValues);
  const traceStep = artifact.optimizerTrace.steps[Math.min(optimizerStep, artifact.optimizerTrace.steps.length - 1)];
  const proposedStep = artifact.optimizerTrace.steps[Math.min(optimizerStep + 1, artifact.optimizerTrace.steps.length - 1)];
  const gradientAngle = Math.atan2(-gradient[1], gradient[0]) * 180 / Math.PI;
  return (
    <div className={styles.bridgeVisual}>
      <div className={styles.surfaceGrid} aria-label={`Precomputed 17 by 17 BridgeStan log-density surface. Selected theta is ${theta1.toFixed(2)}, ${theta2.toFixed(2)}; log density ${logp.toFixed(4)}; unconstrained gradient ${gradient.map((value) => value.toFixed(4)).join(", ")}. The arrow direction encodes that gradient.`} role="img">{densityValues.map((value, index) => <i key={index} style={{ opacity: 0.12 + 0.82 * ((value - densityMin) / (densityMax - densityMin || 1)) }} />)}<span style={{ left: `${(xIndex / (axis.length - 1)) * 100}%`, top: `${100 - (yIndex / (axis.length - 1)) * 100}%`, transform: `translate(-50%, -50%) rotate(${gradientAngle}deg)` }}>→</span></div>
      <div><label>Surface θ1 {theta1.toFixed(2)}<input max={axis.length - 1} min="0" onChange={(event) => setXIndex(Number(event.target.value))} type="range" value={xIndex} /></label><label>Surface θ2 {theta2.toFixed(2)}<input max={axis.length - 1} min="0" onChange={(event) => setYIndex(Number(event.target.value))} type="range" value={yIndex} /></label><label>Recorded optimizer step {traceStep.step}<input max={artifact.optimizerTrace.steps.length - 1} min="0" onChange={(event) => setOptimizerStep(Number(event.target.value))} type="range" value={optimizerStep} /></label><dl><dt>surface log density</dt><dd>{logp.toFixed(4)}</dd><dt>surface gradient</dt><dd>[{gradient.map((value) => value.toFixed(4)).join(", ")}]</dd><dt>optimizer current θ</dt><dd>[{traceStep.theta.map((value) => value.toFixed(4)).join(", ")}]</dd><dt>next recorded θ</dt><dd>[{proposedStep.theta.map((value) => value.toFixed(4)).join(", ")}]</dd><dt>log-density change</dt><dd>{(proposedStep.logDensity - traceStep.logDensity).toFixed(5)}</dd><dt>finite-difference check</dt><dd>{artifact.gradientCheck.status}; max error {artifact.gradientCheck.maxAbsoluteError.toExponential(1)}</dd></dl><details><summary>Inspect the selected surface and optimizer values</summary><TableScroll label="Scrollable BridgeStan surface and optimizer values"><table><caption>Selected BridgeStan interface outputs from the checksummed artifact.</caption><thead><tr><th scope="col">Record</th><th scope="col">θ1</th><th scope="col">θ2</th><th scope="col">Log density</th><th scope="col">Gradient</th></tr></thead><tbody><tr><th scope="row">Surface probe</th><td>{theta1.toFixed(4)}</td><td>{theta2.toFixed(4)}</td><td>{logp.toFixed(5)}</td><td>{gradient.map((value) => value.toFixed(5)).join(", ")}</td></tr><tr><th scope="row">Optimizer step {traceStep.step}</th><td>{traceStep.theta[0].toFixed(4)}</td><td>{traceStep.theta[1].toFixed(4)}</td><td>{traceStep.logDensity.toFixed(5)}</td><td>{traceStep.gradient.map((value) => value.toFixed(5)).join(", ")}</td></tr></tbody></table></TableScroll></details></div>
    </div>
  );
}

function ViewerVisual() {
  const [panel, setPanel] = useState("raster");
  const [annotated, setAnnotated] = useState(true);
  return (
    <div className={styles.viewerMini}>
      <nav>{["raster", "tuning", "model"].map((name) => <button aria-pressed={panel === name} key={name} onClick={() => setPanel(name)} type="button">{name}</button>)}</nav>
      <div aria-label={`Selected linked panel ${panel}. Annotation is ${annotated ? "shown" : "hidden"}.`} role="img"><span className="mono">figure={panel}&amp;annotation={annotated ? 1 : 0}</span><div className={styles.miniMarks}>{Array.from({ length: 48 }, (_, index) => <i key={index} style={{ height: `${15 + ((index * 19 + panel.length) % 78)}%` }} />)}</div>{annotated ? <p>Selected evidence remains tied to dataset, version, code, and limitations.</p> : null}</div>
      <button className="button-quiet" onClick={() => setAnnotated((current) => !current)} type="button">{annotated ? "Hide" : "Show"} annotation</button>
    </div>
  );
}

function PyTorchVisual({ dataset }: { dataset: DemoDataset }) {
  const model = dataset.models.pytorch;
  const comparisons = model?.architectureComparisons ?? [];
  const [architectureId, setArchitectureId] = useState("");
  const [checkpoint, setCheckpoint] = useState(0);
  const [view, setView] = useState<"architecture" | "activation" | "prediction">("architecture");
  const activeArchitecture = comparisons.find((entry) => entry.id === architectureId)
    ?? comparisons.find((entry) => entry.id === model?.selectedArchitectureId)
    ?? comparisons[0];
  const checkpoints = activeArchitecture?.trainingCheckpoints ?? model?.trainingCheckpoints ?? [];
  const layers = activeArchitecture?.architecture
    ?? (Array.isArray(model?.configuration?.architecture) ? model.configuration.architecture.filter((value): value is number => typeof value === "number") : []);
  const isSelectedArchitecture = !activeArchitecture || activeArchitecture.id === model?.selectedArchitectureId;
  if (!model?.artifactAvailable || !layers.length || !checkpoints.length) return <p className="notice"><strong>Training artifact unavailable.</strong> The fallback does not fabricate epochs, losses, or a trained network.</p>;
  const active = checkpoints[Math.min(checkpoint, checkpoints.length - 1)];
  const activation = model.activationExample;
  const activationColumns = activation ? [activation.standardizedInput, activation.hiddenActivation, [activation.predictedCount]] : [];
  const activationMaximum = Math.max(1, ...activationColumns.flat().map((value) => Math.abs(value)));
  const predictionMaximum = Math.max(1, ...model.observed, ...model.predicted);
  return (
    <div>
      <div className={styles.visualControls}><span className="mono">Architecture {layers.join("–")}{isSelectedArchitecture ? " · validation selected" : " · comparison candidate"}</span><div>{(["architecture", "activation", "prediction"] as const).map((name) => <button aria-pressed={view === name} disabled={name === "activation" && (!activation || !isSelectedArchitecture)} key={name} onClick={() => setView(name)} type="button">{name}</button>)}</div>{view === "architecture" ? <><label>Compare architecture <select onChange={(event) => { setArchitectureId(event.target.value); setCheckpoint(0); }} value={activeArchitecture?.id ?? ""}>{comparisons.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label><label>Recorded checkpoint {active.epoch}<input max={checkpoints.length - 1} min="0" onChange={(event) => setCheckpoint(Number(event.target.value))} type="range" value={Math.min(checkpoint, checkpoints.length - 1)} /></label></> : null}</div>
      {view !== "prediction" ? <div className={styles.networkVisual} aria-label={view === "activation" && activation ? `Actual held-out activation example for test row ${activation.testRow}. Four standardized inputs feed eight tanh activations and a softplus predicted count of ${activation.predictedCount.toFixed(5)}.` : `Actually trained CPU network with layer sizes ${layers.join(", ")}. Recorded epoch ${active.epoch}: training Poisson NLL ${active.trainingPoissonNll.toFixed(5)}, validation Poisson NLL ${active.validationPoissonNll.toFixed(5)}.`} role="img">{layers.map((count, column) => <div key={`${count}-${column}`}>{Array.from({ length: count }, (_, index) => { const value = activationColumns[column]?.[index]; const opacity = view === "activation" && typeof value === "number" ? 0.25 + 0.75 * Math.abs(value) / activationMaximum : 0.4 + ((index + column) % 4) * 0.14; return <i key={index} style={{ opacity }} title={view === "activation" && typeof value === "number" ? value.toFixed(5) : undefined} />; })}</div>)}</div> : <svg aria-label={`Display-strided final-test observed and predicted next-bin counts for the computed PyTorch model. Solid is observed; dashed is predicted. The metric uses all ${model.heldOutSampleCount} final-test rows.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 160"><path d={sparkPath(model.observed, 440, 125, predictionMaximum)} fill="none" stroke="var(--ink)" strokeWidth="2" /><path d={sparkPath(model.predicted, 440, 125, predictionMaximum)} fill="none" stroke="var(--blue)" strokeDasharray="6 4" strokeWidth="2.3" /><text className={styles.svgLabel} x="24" y="145">solid observed · dashed predicted · every {model.displayStride}th row shown</text></svg>}
      {view === "architecture" ? <><TableScroll label="Scrollable PyTorch architecture comparison"><table><caption>All three deterministic CPU candidates. Architecture selection uses validation only; final-test values are reported afterward and do not drive selection.</caption><thead><tr><th scope="col">Architecture</th><th scope="col">Parameters</th><th scope="col">Weight decay</th><th scope="col">Best epoch</th><th scope="col">Validation deviance</th><th scope="col">Final-test deviance</th><th scope="col">Status</th></tr></thead><tbody>{comparisons.map((entry) => <tr key={entry.id}><th scope="row">{entry.label}</th><td>{entry.parameterCount}</td><td>{entry.weightDecay}</td><td>{entry.bestEpoch}</td><td>{entry.validationMetricValue.toFixed(6)}</td><td>{entry.finalTestMetricValue.toFixed(6)}</td><td>{entry.selected ? "Selected" : "Reported"}</td></tr>)}</tbody></table></TableScroll><TableScroll label="Scrollable selected PyTorch training checkpoints"><table><caption>Every stored checkpoint for {activeArchitecture?.label ?? "the selected architecture"}.</caption><thead><tr><th scope="col">Epoch</th><th scope="col">Training Poisson NLL</th><th scope="col">Validation Poisson NLL</th></tr></thead><tbody>{checkpoints.map((entry) => <tr key={entry.epoch}><th scope="row">{entry.epoch}{entry.selectedCheckpoint ? " · selected" : ""}</th><td>{entry.trainingPoissonNll.toFixed(6)}</td><td>{entry.validationPoissonNll.toFixed(6)}</td></tr>)}</tbody></table></TableScroll></> : view === "activation" && activation ? <TableScroll label="Scrollable PyTorch activation values"><table><caption>Computed activations for frozen final-test row {activation.testRow}; values come from the saved validation-selected model.</caption><thead><tr><th scope="col">Layer</th><th scope="col">Values</th></tr></thead><tbody><tr><th scope="row">Standardized input</th><td>{activation.standardizedInput.map((value) => value.toFixed(5)).join(", ")}</td></tr><tr><th scope="row">Hidden pre-activation</th><td>{activation.hiddenPreActivation.map((value) => value.toFixed(5)).join(", ")}</td></tr><tr><th scope="row">Hidden tanh activation</th><td>{activation.hiddenActivation.map((value) => value.toFixed(5)).join(", ")}</td></tr><tr><th scope="row">Output pre-activation</th><td>{activation.outputPreActivation.toFixed(5)}</td></tr><tr><th scope="row">Softplus prediction</th><td>{activation.predictedCount.toFixed(5)}</td></tr></tbody></table></TableScroll> : <TableScroll label="Scrollable PyTorch held-out prediction values"><table><caption>Representative values from the display-strided final-test prediction trace.</caption><thead><tr><th scope="col">Displayed index</th><th scope="col">Observed</th><th scope="col">Predicted</th></tr></thead><tbody>{model.observed.filter((_, index) => index % Math.max(1, Math.ceil(model.observed.length / 20)) === 0).map((value, row) => { const index = row * Math.max(1, Math.ceil(model.observed.length / 20)); return <tr key={index}><th scope="row">{index}</th><td>{value.toFixed(4)}</td><td>{model.predicted[index].toFixed(4)}</td></tr>; })}</tbody></table></TableScroll>}
      <p className="fine-print">{model.selectionRule} The selected regularized model’s final-test mean Poisson deviance is {model.metricValue?.toFixed(6)} versus NeMoS {dataset.models.nemos?.metricValue?.toFixed(6)}. This one-session result does not establish that deeper models are generally better.</p>
    </div>
  );
}

function SklearnVisual({ dataset }: { dataset: DemoDataset }) {
  const model = dataset.models.sklearn;
  const [feature, setFeature] = useState(0);
  const [alpha, setAlpha] = useState(0.1);
  const [view, setView] = useState<"cross-validation" | "coefficients" | "prediction">("cross-validation");
  const names = ["x", "y", "trailing speed", "current count"];
  const audit = model?.crossValidation;
  const baseline = model?.baseline;
  if (!model?.artifactAvailable || model.coefficients?.length !== 4 || !audit || !baseline) return <p className="notice"><strong>Baseline artifact unavailable.</strong> The fallback does not invent cross-validation folds or scores.</p>;
  const selectedSummary = audit.summary.find((entry) => entry.alpha === alpha) ?? audit.summary.at(-1)!;
  const selectedMaximum = Math.max(1, ...selectedSummary.foldDeviances);
  const predictionMaximum = Math.max(1, ...model.observed, ...model.predicted);
  return (
    <div>
      <div className={styles.visualControls}>
        <label>Workbench view <select onChange={(event) => setView(event.target.value as "cross-validation" | "coefficients" | "prediction")} value={view}><option value="cross-validation">Cross-validation audit</option><option value="coefficients">Fitted coefficients</option><option value="prediction">Final-test prediction</option></select></label>
        {view === "cross-validation" ? <label>Inspect alpha <select onChange={(event) => setAlpha(Number(event.target.value))} value={alpha}>{audit.alphaGrid.map((value) => <option key={value} value={value}>{value}{value === audit.selectedAlpha ? " · selected" : ""}</option>)}</select></label> : null}
        {view === "coefficients" ? <label>Inspect coefficient <select onChange={(event) => setFeature(Number(event.target.value))} value={feature}>{names.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label> : null}
        <span className="mono">PoissonRegressor · α={audit.selectedAlpha}</span>
      </div>
      {view === "cross-validation" ? <>
        <div className={styles.folds} aria-label="Three expanding-window chronological folds contained entirely inside the 3,600-row outer training block. Each fold fits preprocessing only on that fold's training rows." role="img">{audit.folds.map((fold) => <div data-active={selectedSummary.foldDeviances.length > 0} key={fold.id}><span>{fold.id} · train [{fold.trainRows.join(", ")})</span><i>validate [{fold.validationRows.join(", ")})</i><strong>deviance {fold.results.find((entry) => entry.alpha === selectedSummary.alpha)?.meanPoissonDeviance.toFixed(6)}</strong></div>)}</div>
        <svg aria-label={`For alpha ${selectedSummary.alpha}, the three training-only fold-validation mean Poisson deviances are ${selectedSummary.foldDeviances.map((value) => value.toFixed(6)).join(", ")}; their mean is ${selectedSummary.meanPoissonDeviance.toFixed(6)}. Alpha ${audit.selectedAlpha} has the lowest mean.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 150"><path d={sparkPath(selectedSummary.foldDeviances, 420, 112, selectedMaximum)} fill="none" stroke={selectedSummary.alpha === audit.selectedAlpha ? "var(--teal)" : "var(--blue)"} strokeWidth="3" /><text className={styles.svgLabel} x="24" y="134">α={selectedSummary.alpha} · mean fold deviance {selectedSummary.meanPoissonDeviance.toFixed(6)}{selectedSummary.alpha === audit.selectedAlpha ? " · selected" : ""}</text></svg>
        <TableScroll label="Scrollable scikit-learn cross-validation audit"><table><caption>Every alpha and fold-validation score. All folds stay inside outer training rows [{audit.outerTrainingRows.join(", ")}); the outer validation and final test do not select alpha.</caption><thead><tr><th scope="col">Alpha</th>{audit.folds.map((fold) => <th key={fold.id} scope="col">{fold.id}</th>)}<th scope="col">Mean</th><th scope="col">Status</th></tr></thead><tbody>{audit.summary.map((entry) => <tr key={entry.alpha}><th scope="row">{entry.alpha}</th>{entry.foldDeviances.map((value, index) => <td key={audit.folds[index].id}>{value.toFixed(6)}</td>)}<td>{entry.meanPoissonDeviance.toFixed(6)}</td><td>{entry.alpha === audit.selectedAlpha ? "Selected" : "Compared"}</td></tr>)}</tbody></table></TableScroll>
        <TableScroll label="Scrollable scikit-learn baseline comparison"><table><caption>Leakage-safe intercept-only reference compared with the cross-validated PoissonRegressor. Final test values are reported after alpha selection.</caption><thead><tr><th scope="col">Model</th><th scope="col">Validation deviance</th><th scope="col">Final-test deviance</th><th scope="col">Selection role</th></tr></thead><tbody><tr><th scope="row">{baseline.label}</th><td>{baseline.validationMetricValue.toFixed(6)}</td><td>{baseline.finalTestMetricValue.toFixed(6)}</td><td>Reference only</td></tr><tr><th scope="row">PoissonRegressor α={audit.selectedAlpha}</th><td>{model.validationMetricValue?.toFixed(6)}</td><td>{model.metricValue?.toFixed(6)}</td><td>Training-only CV selected</td></tr></tbody></table></TableScroll>
      </> : view === "coefficients" ? <>
        <svg aria-label={`Four fitted standardized scikit-learn coefficients: ${names.map((name, index) => `${name} ${model.coefficients![index].toFixed(4)}`).join(", ")}. ${names[feature]} is selected.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 150"><line stroke="var(--line-strong)" x1="24" x2="420" y1="76" y2="76" />{model.coefficients.map((value, index) => <rect fill={index === feature ? "var(--amber)" : value >= 0 ? "var(--teal)" : "var(--rose)"} height={Math.abs(value) * 110} key={names[index]} opacity={index === feature ? 1 : .68} width="56" x={66 + index * 88} y={value >= 0 ? 76 - value * 110 : 76} />)}<text className={styles.svgLabel} x="24" y="136">Selected: {names[feature]} = {model.coefficients[feature].toFixed(4)} standardized log-rate units</text></svg>
        <TableScroll label="Scrollable scikit-learn coefficients"><table><caption>All four coefficients from the alpha-selected fit on the outer training block.</caption><thead><tr><th scope="col">Feature</th><th scope="col">Coefficient</th></tr></thead><tbody>{names.map((name, index) => <tr key={name}><th scope="row">{name}</th><td>{model.coefficients![index].toFixed(6)}</td></tr>)}</tbody></table></TableScroll>
      </> : <>
        <svg aria-label={`Display-strided final-test observed and predicted next-bin counts for scikit-learn. Solid is observed and dashed is predicted. Mean Poisson deviance ${model.metricValue?.toFixed(6)} uses all ${model.heldOutSampleCount} final-test rows.`} className={styles.signatureSvg} role="img" viewBox="0 0 440 150"><path d={sparkPath(model.observed, 440, 118, predictionMaximum)} fill="none" stroke="var(--ink)" strokeWidth="2" /><path d={sparkPath(model.predicted, 440, 118, predictionMaximum)} fill="none" stroke="var(--blue)" strokeDasharray="6 4" strokeWidth="2.3" /><text className={styles.svgLabel} x="24" y="136">solid observed · dashed predicted · every {model.displayStride}th test row shown</text></svg>
        <TableScroll label="Scrollable scikit-learn held-out prediction values"><table><caption>Representative values from the display-strided final-test trace; the metric uses all {model.heldOutSampleCount} rows.</caption><thead><tr><th scope="col">Displayed index</th><th scope="col">Observed</th><th scope="col">Predicted</th></tr></thead><tbody>{model.observed.filter((_, index) => index % Math.max(1, Math.ceil(model.observed.length / 20)) === 0).map((value, row) => { const index = row * Math.max(1, Math.ceil(model.observed.length / 20)); return <tr key={index}><th scope="row">{index}</th><td>{value.toFixed(4)}</td><td>{model.predicted[index].toFixed(4)}</td></tr>; })}</tbody></table></TableScroll>
      </>}
      <p className="notice"><strong>Leakage boundary:</strong> {audit.selectionRule} The final 30-second gap precedes {model.heldOutSampleCount} untouched test rows. The training-mean baseline ({baseline.trainingMeanCount.toFixed(6)} count per bin) is computed only from outer training targets.</p>
    </div>
  );
}

function PlotlyVisual({ dataset }: { dataset: DemoDataset }) {
  const spec = useMemo<PlotlyFigureSpec>(() => ({ data: [{ x: dataset.derived.tuning.bins, y: dataset.derived.tuning.rate, type: "scatter", mode: "lines+markers", line: { color: "#136f63", width: 2 }, marker: { size: 6 }, name: "Firing rate", hovertemplate: "%{x:.3f} m/s<br>%{y:.2f} Hz<extra></extra>" }, { x: dataset.derived.tuning.bins, y: dataset.derived.tuning.occupancy, type: "bar", marker: { color: "rgba(155,100,32,.28)", pattern: { shape: "/" } }, yaxis: "y2", name: "Occupancy" }], layout: { title: { text: "Occupancy-aware speed tuning" }, xaxis: { title: { text: "Speed (m/s)" } }, yaxis: { title: { text: "Firing rate (Hz)" } }, yaxis2: { title: { text: "Occupancy (s)" }, overlaying: "y", side: "right", showgrid: false }, barmode: "overlay", legend: { orientation: "h" } }, summary: dataset.accessibleSummaries.tuning, accessibleTable: { caption: "Every plotted speed bin with its t1c1 firing rate and occupancy.", columns: ["Speed (m/s)", "Firing rate (Hz)", "Occupancy (s)"], rows: dataset.derived.tuning.bins.map((value, index) => [value, dataset.derived.tuning.rate[index], dataset.derived.tuning.occupancy[index]]) } }), [dataset]);
  return <PlotlyFigure spec={spec} />;
}

function NwbVisual() {
  const [path, setPath] = useState("/units");
  const entries = [["/general", "session metadata"], ["/processing/behavior/Position", "30,000 LED1 x/y samples"], ["/units", "8 sorted units"], ["/general/extracellular_ephys/electrodes", "one public electrode-table row; no channel-count inference"]] as const;
  return (
    <div className={styles.nwbVisual}>
      <nav aria-label="NWB file hierarchy">{entries.map(([value, note]) => <button aria-pressed={path === value} key={value} onClick={() => setPath(value)} type="button"><code>{value}</code><span>{note}</span></button>)}</nav>
      <article aria-live="polite"><p className="eyebrow">Selected path</p><h3>{path}</h3><p>{entries.find(([value]) => value === path)?.[1]}</p><span className="status-pill" data-tone="public">Validated public metadata</span></article>
    </div>
  );
}

export function ToolSignatureVisual({ slug, name }: Props) {
  const [dataset, setDataset] = useState<DemoDataset>(() => createSyntheticFallback());
  useEffect(() => { const controller = new AbortController(); loadDemoDataset(controller.signal).then(setDataset).catch(() => undefined); return () => controller.abort(); }, []);

  let visual: React.ReactNode;
  switch (slug) {
    case "python": visual = <PythonVisual dataset={dataset} />; break;
    case "jupyterlab": visual = <NotebookVisual />; break;
    case "pynapple": visual = <PynappleVisual dataset={dataset} />; break;
    case "nemos": visual = <NemosVisual dataset={dataset} />; break;
    case "plenoptic": visual = <PlenopticVisual />; break;
    case "stan": visual = <StanVisual dataset={dataset} />; break;
    case "bridgestan": visual = <BridgeStanVisual />; break;
    case "figurl": visual = <ViewerVisual />; break;
    case "pytorch": visual = <PyTorchVisual dataset={dataset} />; break;
    case "scikit-learn": visual = <SklearnVisual dataset={dataset} />; break;
    case "plotly": visual = <PlotlyVisual dataset={dataset} />; break;
    case "nwb": visual = <NwbVisual />; break;
  }

  return (
    <div className={styles.frame}>
      <div className={styles.frameHead}><div><span className="mono">INTERACTIVE MODULE</span><strong>{name}</strong></div><Disclosure origin={slug === "plenoptic" || slug === "bridgestan" ? "separate computed demonstration" : slug === "nwb" ? "verified public source" : dataset.metadata.origin} execution={slug === "pynapple" || slug === "plotly" || slug === "figurl" ? "client-derived view" : slug === "nwb" ? "source inspection" : "checksummed artifact"} /></div>
      <div className={styles.frameBody}>{visual}</div>
    </div>
  );
}
