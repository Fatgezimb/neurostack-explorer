"use client";

import { useState } from "react";
import styles from "./ToolMiniDemo.module.css";

export type ToolMiniKind =
  | "pipeline"
  | "notebook"
  | "raster"
  | "matrix"
  | "image"
  | "posterior"
  | "surface"
  | "viewer"
  | "network"
  | "split"
  | "plot"
  | "tree";

type Props = {
  kind: ToolMiniKind;
  label: string;
  seed: number;
};

const demoSteps: Record<ToolMiniKind, readonly [string, string, string]> = {
  pipeline: ["NWB source validated", "LED1 + 8 units selected", "Compact artifact written"],
  notebook: ["Pinned inputs loaded", "Artifact checks passed", "Executed output recorded"],
  raster: ["8 checked-in spike trains", "Pynapple 100 ms count verified", "t1c1 speed tuning artifact"],
  matrix: ["5,999 × 4 task assembled", "Ridge Poisson GLM fitted", "Test deviance: 0.848559"],
  image: ["24 × 24 source image", "80 synthesis iterations", "Final loss: 0.0000371706"],
  posterior: ["α interval inspected", "β[2] interval inspected", "β[4] interval inspected"],
  surface: ["θ = (0.4, −0.7)", "∇ = (−0.645, 0.840)", "Gradient check error: 2e−10"],
  viewer: ["Posterior figure selected", "Annotation 1 focused", "View state encoded in URL"],
  network: ["3 predeclared candidates", "regularized 4–8–1 selected", "Test deviance: 0.778533"],
  split: ["3,600 train rows", "600 validation + 300 gap", "1,499 held-out test rows"],
  plot: ["t1c1 speed tuning", "Occupancy shown alongside rate", "Accessible table available"],
  tree: ["NWB 2.6.0 opened", "LED1 spatial series located", "8 unit rows selected"],
};

const spikeRows = [
  [3.95, 3.97, 4.06, 4.16, 4.61, 5.1, 6.79, 8.29, 8.38, 13.73, 20.04, 20.08, 22.01, 22.61],
  [5.23, 8.5, 11.58, 55.23, 71.2, 74.11, 74.19, 96.41, 97.93, 98.02, 98.6, 98.61, 99.1, 99.11],
  [0.91, 2.67, 2.85, 3.51, 3.62, 3.84, 4.4, 5.3, 5.91, 6.41, 6.46, 7.08, 7.62, 7.72],
  [5.18, 5.24, 8.48, 8.89, 8.92, 9.31, 9.33, 9.4, 9.44, 9.88, 10.24, 10.67, 10.85, 11.16],
  [12.15, 12.2, 15.9, 16.95, 16.99, 18.74, 19.8, 20.54, 21, 21.46, 21.49, 21.94, 22.41, 22.59],
  [10.58, 12.13, 16.82, 16.87, 16.92, 16.96, 18.08, 18.62, 18.78, 19.12, 19.66, 19.77, 20.38, 20.5],
  [0.4, 11.22, 15.87, 15.93, 16.27, 16.77, 17.12, 18.11, 18.27, 18.66, 18.81, 19.69, 19.83, 20.09],
  [12.15, 12.2, 15.9, 16.85, 16.93, 16.95, 16.99, 18.05, 18.74, 19.8, 19.93, 19.96, 20.54, 21],
];

const tuningRate = [1.91, 1.96, 2.15, 2.31, 2.12, 2.5, 2.4, 3.13, 2.76, 4.09, 3.96, 4.43, 5.49, 4.29, 4.92, 4.66, 4.02, 8.43, 4.42, 5.45];
const occupancy = [60.6, 73, 50.7, 50.3, 46.8, 43.6, 42.5, 34.2, 31.9, 25.9, 27.5, 25.3, 20.6, 16.3, 12.8, 11.6, 8.2, 5.1, 4.3, 8.8];

function pathFrom(values: readonly number[], width: number, height: number) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = Math.max(maximum - minimum, 1);
  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - minimum) / span) * height;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function PythonDemo({ step }: { step: number }) {
  const lines = [
    ["from pynwb import NWBHDF5IO, validate", 'validate(path=source_path)'],
    ["position = SpatialSeriesLED1", "units = [t1c1, …, t4c1]  # 8"],
    ["position = position[::5]  # 100 ms", "write_json(artifact, compact=True)"],
  ] as const;
  return (
    <div className={styles.codeWindow}>
      <div className={styles.windowBar}><i /><i /><i /><span>artifacts.py</span></div>
      <code><b>{String(step + 1).padStart(2, "0")}</b> {lines[step][0]}</code>
      <code><b>{String(step + 2).padStart(2, "0")}</b> {lines[step][1]}</code>
      <div className={styles.terminalLine}><span>status</span><strong>{step === 2 ? "sha256 recorded" : "passed"}</strong></div>
    </div>
  );
}

function NotebookDemo({ step }: { step: number }) {
  return (
    <div className={styles.notebook}>
      <div className={styles.notebookRail}><span /><span /><span /></div>
      <div className={styles.cell} data-active={step === 0}><span>In [1]</span><code>load_artifacts()</code></div>
      <div className={styles.cell} data-active={step === 1}><span>In [2]</span><code>assert model[&quot;artifactAvailable&quot;]</code></div>
      <div className={styles.cell} data-active={step === 2}><span>Out[2]</span><strong>4 fitted artifacts · passed</strong></div>
      <small>Executed with nbclient · sanitized</small>
    </div>
  );
}

function PynappleDemo({ step }: { step: number }) {
  return (
    <div className={styles.rasterDemo}>
      <div className={styles.rasterLabels}><span>t1c1</span><span>t2c1</span><span>t2c3</span><span>t3c1</span><span>t3c2</span><span>t3c3</span><span>t3c4</span><span>t4c1</span></div>
      <svg viewBox="0 0 100 64" preserveAspectRatio="none">
        {spikeRows.map((row, rowIndex) => (
          <g key={rowIndex} opacity={step === 2 && rowIndex !== 0 ? 0.18 : 1}>
            {row.map((x) => <line key={x} x1={x} x2={x} y1={rowIndex * 8 + 1} y2={rowIndex * 8 + 6} />)}
          </g>
        ))}
      </svg>
      <span className={styles.rasterWindow}>first 20 s · public-derived</span>
      <div className={styles.rasterReadout}>
        {step === 0 ? <><b>8</b><span>artifact unit rows</span></> : step === 1 ? <><b>0.1 s</b><span>Pynapple bins · matched</span></> : <><b>1,759</b><span>t1c1 spikes</span></>}
      </div>
    </div>
  );
}

function NemosDemo({ step }: { step: number }) {
  const coefficients = [-0.0547, -0.1382, 0.0737, 0.4089];
  return (
    <div className={styles.matrixDemo}>
      <div className={styles.matrixGrid} aria-hidden="true">
        {Array.from({ length: 28 }, (_, index) => <i key={index} style={{ opacity: 0.18 + ((index * 7) % 10) / 14 }} />)}
      </div>
      <div className={styles.matrixArrow}>×</div>
      <div className={styles.coefficientVector}>
        {coefficients.map((coefficient, index) => <span key={coefficient} data-strong={index === (step + 1) % 4}>{coefficient.toFixed(3)}</span>)}
      </div>
      <div className={styles.matrixOutput}>{step === 0 ? "X: 5,999 × 4" : step === 1 ? "exp(Xβ + α)" : "D² = 0.848559"}</div>
    </div>
  );
}

function PlenopticDemo({ step }: { step: number }) {
  const images = [
    ["/artifacts/v1/plenoptic-source.png", "SOURCE"],
    ["/artifacts/v1/plenoptic-synthesis.png", "SYNTHESIS"],
    ["/artifacts/v1/plenoptic-difference.png", "SIGNED Δ"],
  ] as const;
  return (
    <div className={styles.imageDemo}>
      {images.map(([src, label], index) => (
        <div className={styles.imageFrame} data-active={index === step} key={src}>
          <i className={styles.imagePixels} style={{ backgroundImage: `url(${src})` }} />
          <span>{label}</span>
        </div>
      ))}
      <div className={styles.lossRail}><i style={{ width: `${[0, 64, 100][step]}%` }} /></div>
    </div>
  );
}

function StanDemo({ step }: { step: number }) {
  const intervals = [
    { label: "α", left: 8, width: 36, mean: 27, text: "−1.432 … −1.194" },
    { label: "β[2]", left: 35, width: 34, mean: 51, text: "−0.319 … −0.098" },
    { label: "β[4]", left: 70, width: 17, mean: 80, text: "0.357 … 0.461" },
  ];
  return (
    <div className={styles.intervalDemo}>
      {intervals.map((interval, index) => (
        <div data-active={index === step} key={interval.label}>
          <span>{interval.label}</span>
          <i><b style={{ left: `${interval.left}%`, width: `${interval.width}%` }} /><em style={{ left: `${interval.mean}%` }} /></i>
          <small>{interval.text}</small>
        </div>
      ))}
      <p>central 90% credible intervals · 0 divergences</p>
    </div>
  );
}

function BridgeStanDemo({ step }: { step: number }) {
  return (
    <div className={styles.surfaceDemo}>
      <svg viewBox="0 0 180 92">
        <ellipse cx="84" cy="47" rx="72" ry="38" />
        <ellipse cx="84" cy="47" rx="51" ry="27" />
        <ellipse cx="84" cy="47" rx="29" ry="15" />
        <line className={styles.gradientArrow} x1="119" x2={step === 0 ? 119 : 82} y1="68" y2={step === 0 ? 68 : 45} />
        <path className={styles.arrowHead} d="M82 45 L91 45 L86 53 Z" opacity={step === 0 ? 0 : 1} />
        <circle cx="119" cy="68" r="4" />
      </svg>
      <div className={styles.surfaceAxes}><span>θ₁</span><span>log density</span><span>θ₂</span></div>
      <code>{step === 0 ? "log_density(θ)" : step === 1 ? "log_density_gradient(θ)" : "analytic ≈ finite difference"}</code>
    </div>
  );
}

function ViewerDemo({ step }: { step: number }) {
  return (
    <div className={styles.viewerDemo}>
      <div className={styles.urlBar}><span>●</span><code>/visualizations?figure=posterior{step > 0 ? "&annotation=1" : ""}</code></div>
      <div className={styles.viewerBody}>
        <aside><i data-active={step === 0}>figure</i><i data-active={step === 1}>note 1</i><i data-active={step === 2}>source</i></aside>
        <svg viewBox="0 0 110 54"><path d="M2 48 C18 44, 23 14, 39 11 C55 8, 59 43, 75 37 C88 32, 95 15, 108 10" /><line x1="60" x2="60" y1="6" y2="50" /></svg>
      </div>
    </div>
  );
}

function PyTorchDemo({ step }: { step: number }) {
  return (
    <div className={styles.networkDemo}>
      {[4, 8, 1].map((count, column) => (
        <div data-active={step === column} key={count}>
          <span>{column === 0 ? "features" : column === 1 ? "tanh" : "softplus"}</span>
          <div>{Array.from({ length: count }, (_, index) => <i key={index} />)}</div>
          <b>{count}</b>
        </div>
      ))}
      <small>selected regularized MLP · CPU float64 · epoch 22 / 72</small>
    </div>
  );
}

function SplitDemo({ step }: { step: number }) {
  return (
    <div className={styles.splitDemo}>
      <div className={styles.splitRail}>
        <i className={styles.train} data-active={step === 0}><span>train</span><b>3,600</b></i>
        <i className={styles.validation} data-active={step === 1}><span>val</span><b>600</b></i>
        <i className={styles.gap} data-active={step === 1}><span>gap</span><b>300</b></i>
        <i className={styles.test} data-active={step === 2}><span>test</span><b>1,499</b></i>
      </div>
      <div className={styles.splitAxis}><span>row 0</span><span>chronological · no shuffle</span><span>5,999</span></div>
      <code>PoissonRegressor(α=0.1) · selected inside training</code>
    </div>
  );
}

function PlotlyDemo({ step }: { step: number }) {
  return (
    <div className={styles.plotDemo}>
      <div className={styles.plotTools}><span>＋</span><span>⌂</span><span>▣</span></div>
      <svg viewBox="0 0 180 84" preserveAspectRatio="none">
        <g opacity={step === 0 ? 0.15 : 0.42}>
          {occupancy.map((value, index) => <rect height={(value / 73) * 42} key={index} width="5" x={index * 8.8 + 3} y={80 - (value / 73) * 42} />)}
        </g>
        <path d={pathFrom(tuningRate, 168, 56)} transform="translate(5 8)" />
      </svg>
      <div className={styles.plotLegend}><span>rate · spikes/s</span><span>{step === 2 ? "table summary open" : "occupancy · s"}</span></div>
    </div>
  );
}

function NwbDemo({ step }: { step: number }) {
  return (
    <div className={styles.tree}>
      <div data-active={step === 0}><i>▾</i><b>NWBFile</b><span>2.6.0</span></div>
      <div data-active={step === 1}><i>└</i><b>processing / behavior / Position</b></div>
      <div data-active={step === 1}><i>└</i><b>SpatialSeriesLED1</b><span>30,000 samples</span></div>
      <div data-active={step === 2}><i>└</i><b>units</b><span>8 rows selected</span></div>
    </div>
  );
}

function DemoVisual({ kind, step }: { kind: ToolMiniKind; step: number }) {
  switch (kind) {
    case "pipeline": return <PythonDemo step={step} />;
    case "notebook": return <NotebookDemo step={step} />;
    case "raster": return <PynappleDemo step={step} />;
    case "matrix": return <NemosDemo step={step} />;
    case "image": return <PlenopticDemo step={step} />;
    case "posterior": return <StanDemo step={step} />;
    case "surface": return <BridgeStanDemo step={step} />;
    case "viewer": return <ViewerDemo step={step} />;
    case "network": return <PyTorchDemo step={step} />;
    case "split": return <SplitDemo step={step} />;
    case "plot": return <PlotlyDemo step={step} />;
    case "tree": return <NwbDemo step={step} />;
  }
}

export function ToolMiniDemo({ kind, label, seed }: Props) {
  const [step, setStep] = useState(0);
  const steps = demoSteps[kind];
  const nextStep = (step + 1) % steps.length;

  return (
    <div aria-label={label} className={styles.demo} data-seed={seed} data-tool={kind} role="group">
      <div aria-hidden="true" className={styles.visual} data-step={step}>
        <DemoVisual kind={kind} step={step} />
      </div>
      <div className={styles.controls}>
        <div>
          <span aria-live="polite">{steps[step]}</span>
          <small>{String(step + 1).padStart(2, "0")} / 03 · verified artifact view</small>
        </div>
        <button
          aria-label={`Advance ${label}`}
          onClick={() => setStep(nextStep)}
          type="button"
        >
          Step {step + 1}/3 · show {nextStep === 0 ? "start" : nextStep + 1} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
