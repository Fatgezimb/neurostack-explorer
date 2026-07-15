import type { Metadata } from "next";
import Link from "next/link";
import {
  alignedModelRuns,
  artifactManifest,
  methodsSections,
  primaryDatasetProvenance,
} from "@/app/content/scientific";

export const metadata: Metadata = {
  title: "Methods",
  description:
    "The evidence, provenance, temporal validation, leakage control, model-alignment, precomputation, and accessibility methods for NeuroStack Explorer.",
};

export default function MethodsPage() {
  return (
    <main className="page-shell" id="main-content">
      <header className="page-intro">
        <p className="eyebrow">Methods</p>
        <h1>An evidence chain from public source to browser view.</h1>
        <p>
          The method is designed around one principle: a visible result is not
          publishable until its source identity, transformation, parameters,
          code version, execution mode, and interpretive boundary can travel
          with it.
        </p>
        <div className="button-row">
          <Link href="/sources">Inspect source status</Link>
          <Link href="/notebooks">Inspect the notebook contract</Link>
          <Link href="/limitations">Read the limitations</Link>
        </div>
      </header>

      <section className="surface" aria-labelledby="dataset-gate-heading">
        <p className="eyebrow">Dataset gate / {primaryDatasetProvenance.title.status.replaceAll("-", " ")}</p>
        <h2 id="dataset-gate-heading">Dataset identity is pinned before reuse</h2>
        <p>{primaryDatasetProvenance.title.note}</p>
        <p>
          The verified record includes author order, repository, permanent
          identifier, license, species, brain region, modality, exact session,
          selected units or channels, behavioral variables, transformations,
          and access date. The source asset and every web derivative retain that
          identity through a versioned manifest and checksums.
        </p>
      </section>

      <section aria-labelledby="workflow-heading" id="data-derivative">
        <p className="eyebrow">Eight checkpoints</p>
        <h2 id="workflow-heading">Scientific workflow</h2>
        <div className="content-grid">
          {methodsSections.map((section) => (
            <article className="surface" key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.summary}</p>
              <ul>
                {section.checks.map((check) => <li key={check}>{check}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="models-heading">
        <p className="eyebrow">Model question map</p>
        <h2 id="models-heading">Compare only what can be aligned</h2>
        <div className="content-grid">
          {alignedModelRuns.map((model) => (
            <article className="surface" key={model.id}>
              <p className="eyebrow">{model.family.replaceAll("-", " ")}</p>
              <h3>{model.label}</h3>
              <p><strong>Question:</strong> {model.researchQuestion}</p>
              <p><strong>Target:</strong> {model.target}</p>
              <p><strong>Split role:</strong> {model.splitStrategy}</p>
              <p>{model.disclosure}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="artifacts-heading">
        <p className="eyebrow">Artifact ledger</p>
        <h2 id="artifacts-heading">What exists versus what is specified</h2>
        <div className="content-grid">
          {artifactManifest.map((artifact) => (
            <article className="surface" key={artifact.id}>
              <p className="eyebrow">{artifact.origin} / {artifact.execution}</p>
              <h3>{artifact.label}</h3>
              <p><strong>Status:</strong> {artifact.status.replaceAll("-", " ")}</p>
              <p><strong>Generator contract:</strong> <code>{artifact.generatedBy}</code></p>
              <p>{artifact.disclosure}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="surface" aria-labelledby="reproduction-heading">
        <p className="eyebrow">Determinism contract</p>
        <h2 id="reproduction-heading">A cache is not provenance</h2>
        <p>
          A cached output becomes reproducible only when the source identity,
          selected variables, parameters, code version, package environment,
          seed, generator, and output hash are recorded. Client-side controls
          may deterministically filter, bin, smooth, or select a bounded
          artifact; they do not transform a precomputed model into a live one.
        </p>
      </section>
    </main>
  );
}
