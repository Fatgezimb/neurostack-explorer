import type { Metadata } from "next";
import Link from "next/link";
import { limitationGroups, unresolvedEvidence } from "@/app/content/limitations";

export const metadata: Metadata = {
  title: "Limitations",
  description:
    "The data, analysis, model, execution, clinical, authorship, and unresolved-evidence limitations of NeuroStack Explorer.",
};

export default function LimitationsPage() {
  return (
    <main className="page-shell" id="main-content">
      <header className="page-intro">
        <p className="eyebrow">Limitations</p>
        <h1>What this demonstration cannot establish.</h1>
        <p>
          Limitations are part of the result, not footer fine print. They define
          what can be inferred from one public dataset, which comparisons are
          valid, what runs offline, and where the project must stop making a
          claim because evidence is not yet available.
        </p>
        <div className="button-row">
          <Link href="/methods">Read the safeguards</Link>
          <Link href="/sources">Inspect source status</Link>
          <Link href="/about">About the project</Link>
        </div>
      </header>

      <section aria-labelledby="limits-heading">
        <p className="eyebrow">Five boundaries</p>
        <h2 id="limits-heading">Interpretation and execution limits</h2>
        <div className="content-grid">
          {limitationGroups.map((group) => (
            <article className="surface" key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="surface" aria-labelledby="pending-heading">
        <p className="eyebrow">Evidence still unresolved</p>
        <h2 id="pending-heading">Claims intentionally withheld</h2>
        <ul>
          {unresolvedEvidence.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p>
          These are not hidden TODOs. They are explicit evidence gates. A page
          may explain its planned scientific role before those gates close, but
          it may not display invented dataset facts, API calls, model outputs,
          execution claims, or performance metrics.
        </p>
      </section>

      <section className="surface" aria-labelledby="clinical-heading">
        <p className="eyebrow">Nonclinical boundary</p>
        <h2 id="clinical-heading">Do not use this project for care decisions</h2>
        <p>
          NeuroStack Explorer is an educational technical demonstration. It
          does not diagnose, recommend treatment, estimate patient risk, or
          provide validated patient-level predictions.
        </p>
      </section>
    </main>
  );
}
