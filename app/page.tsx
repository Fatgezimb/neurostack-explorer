import type { Metadata } from "next";
import { HeroSnapshot } from "./components/HeroSnapshot";
import { ToolMiniDemo } from "./components/ToolMiniDemo";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Interactive Open-Source Neuroscience Explorer",
  description:
    "Explore a reproducible workflow from a pinned public NWB recording through neural time-series analysis, statistical models, machine learning, uncertainty, and shareable scientific figures.",
};

const tools = [
  { slug: "python", name: "Python", role: "Transform a validated NWB session into typed analysis inputs.", visual: "pipeline" },
  { slug: "jupyterlab", name: "JupyterLab", role: "Bind code, narrative, equations, provenance, and outputs in one executable record.", visual: "notebook" },
  { slug: "pynapple", name: "Pynapple", role: "Represent spikes, positions, epochs, rates, tuning, and correlograms.", visual: "raster" },
  { slug: "nemos", name: "NeMoS", role: "Fit an interpretable Poisson GLM to held-out spike counts.", visual: "matrix" },
  { slug: "plenoptic", name: "plenoptic", role: "Test what a fixed visual model preserves through deterministic synthesis.", visual: "image" },
  { slug: "stan", name: "Stan", role: "Estimate posterior uncertainty without confusing credible and confidence intervals.", visual: "posterior" },
  { slug: "bridgestan", name: "BridgeStan", role: "Inspect a compiled model’s log density and unconstrained gradient.", visual: "surface" },
  { slug: "figurl", name: "Scientific Figure Viewer", role: "Share a persistent, linked view with source and analysis metadata.", visual: "viewer" },
  { slug: "pytorch", name: "PyTorch", role: "Compare a small Poisson neural network with simpler encoding models.", visual: "network" },
  { slug: "scikit-learn", name: "scikit-learn", role: "Build a leakage-aware baseline on the same fixed chronological split.", visual: "split" },
  { slug: "plotly", name: "Plotly", role: "Publish responsive, inspectable scientific figures with accessible summaries.", visual: "plot" },
  { slug: "nwb", name: "NWB", role: "Keep neurophysiology data and metadata inside a common, validated schema.", visual: "tree" },
] as const;

const pipelineStages = [
  ["NWB", "Pinned public source"],
  ["Pynapple", "Time-series objects"],
  ["Features", "Position + spike counts"],
  ["Models", "GLM · baseline · MLP"],
  ["Uncertainty", "Stan posterior"],
  ["Figures", "Plotly + viewer"],
] as const;

const toolStatuses: Record<(typeof tools)[number]["slug"], { label: string; tone: "public" | "precomputed" }> = {
  python: { label: "Executed artifact pipeline", tone: "precomputed" },
  jupyterlab: { label: "Executed notebook", tone: "precomputed" },
  pynapple: { label: "Verified count lane", tone: "public" },
  nemos: { label: "Computed model artifact", tone: "precomputed" },
  plenoptic: { label: "Computed synthesis artifact", tone: "precomputed" },
  stan: { label: "Computed posterior artifact", tone: "precomputed" },
  bridgestan: { label: "Computed gradient artifact", tone: "precomputed" },
  figurl: { label: "Client-rendered viewer", tone: "public" },
  pytorch: { label: "Computed model artifact", tone: "precomputed" },
  "scikit-learn": { label: "Computed model artifact", tone: "precomputed" },
  plotly: { label: "Client-rendered figure", tone: "public" },
  nwb: { label: "Verified public source", tone: "public" },
};

export default function Home() {
  return (
    <main id="main-content">
      <section className={`${styles.hero} section-shell`}>
        <div className={styles.heroCopy}>
          <p className="eyebrow">NeuroStack Explorer / technical demonstration</p>
          <h1>Open neural data, made inspectable.</h1>
          <p className="lead">
            Explore how open-source Python tools transform public neurophysiology data into neural analyses,
            statistical models, machine-learning predictions, and interactive scientific visualizations.
          </p>
          <div className="button-row">
            <a className="button" href="/lab">Open the analysis workspace <span aria-hidden="true">→</span></a>
            <a className="button-secondary" href="/pipeline">Explore the complete pipeline</a>
            <a className="button-quiet" href="/notebooks">Open the research notebook</a>
          </div>
          <p className={`${styles.disclaimer} notice`}>
            <strong>Scope:</strong> Built by Fatgezim “Zim” Bela using public and clearly labeled synthetic data.
            This is an educational technical demonstration—not a laboratory, medical device, diagnostic system,
            clinical recommendation, or published study.
          </p>
        </div>
        <HeroSnapshot />
      </section>

      <section aria-labelledby="pipeline-title" className="section-shell">
        <div className="section-intro">
          <p className="eyebrow">One connected analysis record</p>
          <h2 id="pipeline-title">The source stays visible through every transform.</h2>
          <p>
            A published DANDI asset is pinned by version, path, UUID, and SHA-256. Heavy analysis is reproducibly
            precomputed; browser interactions operate on a compact derivative and preserve that provenance.
          </p>
        </div>
        <ol className={styles.pipelineStrip}>
          {pipelineStages.map(([name, note], index) => (
            <li key={name}>
              <span className="mono">{String(index + 1).padStart(2, "0")}</span>
              <strong>{name}</strong>
              <small>{note}</small>
            </li>
          ))}
        </ol>
        <div className="button-row">
          <a className="button-secondary" href="/pipeline">Inspect inputs, outputs, code, and limitations</a>
          <a className="button-quiet" href="/data">View dataset provenance</a>
        </div>
      </section>

      <section aria-labelledby="stack-title" className="section-shell">
        <div className="section-intro">
          <p className="eyebrow">Twelve tools · one reproducible workflow</p>
          <h2 id="stack-title">Each tool has a job, an artifact, and a boundary.</h2>
          <p>
            These compact interfaces are keyed to the checked-in artifacts: exact dimensions, split sizes, model readouts,
            paths, and status labels replace generic animation. They do not imply that Zim created the underlying libraries,
            and every card identifies cached computation or live browser work.
          </p>
        </div>
        <div className={styles.toolGrid}>
          {tools.map((tool, index) => (
            <article className={styles.toolCard} key={tool.slug}>
              <div className={styles.toolHead}>
                <span className="mono">{String(index + 1).padStart(2, "0")}</span>
                <span className="status-pill" data-tone={toolStatuses[tool.slug].tone}>
                  {toolStatuses[tool.slug].label}
                </span>
              </div>
              <h3>{tool.name}</h3>
              <p>{tool.role}</p>
              <ToolMiniDemo kind={tool.visual} label={`${tool.name} miniature demonstration`} seed={index + 1} />
              <a className={styles.cardLink} href={`/tools/${tool.slug}`}>
                Open {tool.name} module <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.closing} section-shell`}>
        <p className="eyebrow">Reproduce before you trust</p>
        <h2>Every result carries its method.</h2>
        <p className="lead">
          Download the notebook, inspect the scripts and model card, verify the dataset hash, or use the seeded
          synthetic fallback when the archive is unavailable.
        </p>
        <div className="button-row">
          <a className="button" href="/notebooks">View the executable notebook</a>
          <a className="button-secondary" href="/methods">Read the methods</a>
          <a className="button-quiet" href="/limitations">Understand the limitations</a>
        </div>
      </section>
    </main>
  );
}
