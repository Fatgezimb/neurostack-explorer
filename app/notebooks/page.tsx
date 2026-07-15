import type { Metadata } from "next";
import Link from "next/link";
import { notebookArtifact } from "@/app/content/notebook";
import styles from "./notebooks.module.css";

export const metadata: Metadata = {
  title: "Research notebook",
  description:
    "Inspect and download the executed NeuroStack Explorer notebook, its evidence chain, execution boundary, and local reproduction sequence.",
};

const previewCells = [
  {
    kind: "markdown",
    title: "Project overview and execution boundary",
    body: "This executed walkthrough loads the exact cached public NWB source, verifies the compact artifacts, and reproduces the bounded Python model lanes locally. It does not download data during execution or expose visitor code execution.",
  },
  {
    kind: "code",
    title: "Verify source and derivative identities",
    code: `assert public["metadata"]["assetUuid"] == EXPECTED_ASSET_UUID\nassert public["metadata"]["sha256"] == EXPECTED_SOURCE_SHA256\nderivative_sha256 = sha256(public_path)`,
    output: "Asset UUID: 2b9e441b-56bc-4be2-893e-0e02d22d239d\nDerivative SHA-256: e56d1ded0dad948c2d3ddb82fc23b3ed2f1280dfc6f341c538ecf06a0c307e64\nLicense: CC-BY-4.0",
  },
  {
    kind: "code",
    title: "Load and validate the exact NWB source",
    code: `source_path = fetch_verified_source(allow_download=False)\nrecording = extract_source_recording(source_path)\nassert recording.schema_validation_errors == ()`,
    output: "NWB version: 2.6.0\nPosition samples: 30,000\nUnits: t1c1, t2c1, t2c3, t3c1, t3c2, t3c3, t3c4, t4c1",
  },
  {
    kind: "code",
    title: "Convert the recording to Pynapple objects",
    code: `support = nap.IntervalSet(start=0.0, end=600.0, time_units="s")\nposition = nap.TsdFrame(t=timestamps, d=xy, columns=["x_m", "y_m"], time_support=support)\nassert np.array_equal(t1c1_counts, serialized_counts)`,
    output: "Pynapple position shape: (6000, 2)\nPynapple spike group size: 8\n100 ms t1c1 count bins verified: 6000",
  },
  {
    kind: "code",
    title: "Refit and compare the bounded model lanes",
    code: `task = prepare_model_task(public)\nnemos_refit = fit_nemos(task)\nsklearn_refit = fit_sklearn(task)\npytorch_refit = fit_pytorch(task)\nassert nemos_refit["metricValue"] == committed_nemos["metricValue"]`,
    output: "Deterministic NeMoS, scikit-learn, and PyTorch results matched the committed model bundle. Stan diagnostics and posterior-predictive output were read from the checksummed sampling artifact.",
  },
  {
    kind: "markdown",
    title: "Takeaway",
    body: "The results describe one 600-second rat MEC session, one selected unit, one fixed next-bin task, and one chronological split. They are technical demonstrations—not population benchmarks, causal results, or clinical evidence.",
  },
] as const;

export default function NotebooksPage() {
  return (
    <main className="page-shell" id="main-content">
      <header className="page-intro">
        <p className="eyebrow">Research notebook</p>
        <h1>{notebookArtifact.title}</h1>
        <p>
          This executed notebook is the read-only scientific narrative for
          provenance, NWB validation, artifact checks, reproducible analysis,
          results, and limitations. It exposes no public or unrestricted kernel.
        </p>
        <div className="tag-list" aria-label="Notebook status">
          <span>Status: {notebookArtifact.status.replaceAll("-", " ")}</span>
          <span>Kernel: {notebookArtifact.kernel}</span>
          <span>Public execution: unavailable</span>
        </div>
        <div className="button-row">
          <a href="/artifacts/v1/neurostack-explorer.ipynb" target="_blank" rel="noopener noreferrer">
            View notebook <span className="visually-hidden">(opens in a new tab)</span>
          </a>
          <a href="/artifacts/v1/neurostack-explorer.ipynb" download="neurostack_explorer.ipynb">Download notebook</a>
          <a href="#reproduce-heading">Run locally</a>
          <a href="#notebook-preview">Read the notebook preview</a>
          <Link href="/methods">Read the methods</Link>
          <Link href="/limitations">Review limitations</Link>
        </div>
      </header>

      <aside className="surface" aria-labelledby="availability-heading">
        <p className="eyebrow">Availability disclosure</p>
        <h2 id="availability-heading">Executed artifact, bounded runtime</h2>
        <p>{notebookArtifact.disclosure}</p>
      </aside>

      <section aria-labelledby="preview-heading" id="notebook-preview">
        <div className="section-intro"><p className="eyebrow">Semantic read-only preview</p><h2 id="preview-heading">Executed code and outputs, without a public kernel.</h2><p>This HTML preview reproduces representative verified cells and results. The downloadable <code>.ipynb</code> above contains all 15 executed sections.</p></div>
        <ol className={styles.notebook}>
          {previewCells.map((cell, index) => <li className={styles.cell} key={cell.title}>
            <div className={styles.cellRail}><span className="mono">{cell.kind === "code" ? "Executed Python" : "Markdown"}</span><span>Preview cell {index + 1}</span></div>
            <article><h3>{cell.title}</h3>{"body" in cell ? <p>{cell.body}</p> : <><pre aria-label={`${cell.title} code`} tabIndex={0}><code>{cell.code}</code></pre><div aria-label="Executed cell output" className={styles.output}><p className="eyebrow">Executed output</p><pre aria-label={`${cell.title} output`} tabIndex={0}><samp>{cell.output}</samp></pre></div></>}</article>
          </li>)}
        </ol>
      </section>

      <section id="notebook-outline" aria-labelledby="outline-heading">
        <p className="eyebrow">{notebookArtifact.sections.length}-part execution narrative</p>
        <h2 id="outline-heading">Notebook outline</h2>
        <div className="content-grid">
          {notebookArtifact.sections.map((section) => (
            <article className="surface" key={section.order}>
              <p className="eyebrow">Cell group {section.order.toString().padStart(2, "0")}</p>
              <h3>{section.title}</h3>
              <p>{section.purpose}</p>
              <p><strong>Required output:</strong> {section.expectedOutput}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="surface" aria-labelledby="reproduce-heading">
        <p className="eyebrow">Local reproduction</p>
        <h2 id="reproduce-heading">The acceptance sequence</h2>
        <ol>
          {notebookArtifact.reproductionSteps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <p>
          The committed notebook is available to inspect or download above.
          “Run locally” means recreating the locked Python environment and
          executing the documented scripts; no Binder, Colab, or hosted-kernel
          button is shown because those environments have not been validated.
        </p>
      </section>
    </main>
  );
}
