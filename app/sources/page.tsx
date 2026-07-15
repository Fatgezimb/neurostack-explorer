import type { Metadata } from "next";
import Link from "next/link";
import { sourceRegistry } from "@/app/content/sources";

export const metadata: Metadata = {
  title: "Sources",
  description:
    "A transparent registry of verified first-party software sources, versions, licenses, repositories, documentation, and citations used by NeuroStack Explorer.",
};

function ExternalSourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {label} <span className="visually-hidden">(opens in a new tab)</span>
    </a>
  );
}

export default function SourcesPage() {
  return (
    <main className="page-shell" id="main-content">
      <header className="page-intro">
        <p className="eyebrow">Source registry</p>
        <h1>First-party links, with verification status attached.</h1>
        <p>
          Every record below was checked against the project’s official website,
          documentation, or source repository on the recorded access date. The
          version shown is the installed release, the locked compatibility lane,
          or—where direct integration is intentionally avoided—the release whose
          current support status informed that decision.
        </p>
        <div className="button-row">
          <Link href="/methods">See how sources enter the method</Link>
          <Link href="/tools">Explore the tools</Link>
          <Link href="/limitations">Review evidence limits</Link>
        </div>
      </header>

      <section className="surface" aria-labelledby="source-rule-heading">
        <p className="eyebrow">Registry rule</p>
        <h2 id="source-rule-heading">No silent substitution</h2>
        <p>
          Documentation is paraphrased and linked, never copied at length. If a
          current first-party source cannot be verified, the implementation
          stays accurately labeled—for example, “Scientific Figure Viewer”
          instead of claiming official Figurl integration.
        </p>
      </section>

      <section aria-labelledby="records-heading">
        <p className="eyebrow">Twelve records</p>
        <h2 id="records-heading">Technology source status</h2>
        <div className="content-grid">
          {sourceRegistry.map((source) => (
            <article className="surface" id={source.id} key={source.id}>
              <p className="eyebrow">{source.verification.replaceAll("-", " ")}</p>
              <h3>{source.toolName}</h3>
              <ul>
                {source.website && (
                  <li><ExternalSourceLink href={source.website} label="Official website" /></li>
                )}
                {source.documentation && (
                  <li><ExternalSourceLink href={source.documentation} label="Official documentation" /></li>
                )}
                {source.repository && (
                  <li><ExternalSourceLink href={source.repository} label="Official source repository" /></li>
                )}
              </ul>
              <p>{source.note}</p>
              <dl>
                <div><dt>License</dt><dd>{source.license ?? "Pending official-source verification"}</dd></div>
                <div><dt>Version used</dt><dd>{source.version ?? "No environment version selected"}</dd></div>
                <div><dt>Access date</dt><dd>{source.accessDate ?? "Not yet recorded"}</dd></div>
                <div><dt>Citation</dt><dd>{source.citation ?? "Pending verified citation guidance"}</dd></div>
              </dl>
              <Link href={`/tools/${source.id}`}>Open the {source.toolName} module</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
