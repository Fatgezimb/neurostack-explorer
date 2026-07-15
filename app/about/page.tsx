import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "About NeuroStack Explorer and Fatgezim “Zim” Bela’s authorship, scientific intent, and nonclinical project boundary.",
};

export default function AboutPage() {
  return (
    <main className="page-shell" id="main-content">
      <header className="page-intro">
        <p className="eyebrow">About the project</p>
        <h1>Built by Fatgezim “Zim” Bela.</h1>
        <p>
          NeuroStack Explorer is a technical exploration of open neuroscience
          data, computational modeling, machine learning, reproducible analysis,
          and scientific visualization.
        </p>
        <div className="button-row">
          <Link href="/tools">Explore the technology stack</Link>
          <Link href="/methods">Read the methods</Link>
          <Link href="/sources">Inspect the sources</Link>
        </div>
      </header>

      <section className="content-grid" aria-label="Project identity">
        <article className="surface">
          <p className="eyebrow">Authorship</p>
          <h2>What Zim is building</h2>
          <p>
            Zim is the author and integrator of this website, its scientific
            workflow, analysis scripts, generated artifacts, explanatory
            content, and interface. The project is intended to demonstrate
            careful technical reasoning across data standards, time-series
            analysis, statistical modeling, machine learning, and accessible
            research communication.
          </p>
        </article>
        <article className="surface">
          <p className="eyebrow">Open-source credit</p>
          <h2>What authorship does not mean</h2>
          <p>
            Zim did not create Python, JupyterLab, Pynapple, NeMoS, plenoptic,
            Stan, BridgeStan, Figurl, PyTorch, scikit-learn, Plotly, or NWB.
            Those projects retain their own maintainers, licenses, citations,
            and technical identities. Public dataset authors retain their own
            credit and ownership.
          </p>
        </article>
        <article className="surface">
          <p className="eyebrow">Scientific intent</p>
          <h2>Questions before scores</h2>
          <p>
            The demonstration centers on inspectable inputs, assumptions,
            transformations, uncertainty, held-out evaluation, provenance, and
            limitations. It does not choose model complexity for spectacle or
            publish a metric before its generating artifact exists.
          </p>
        </article>
        <article className="surface">
          <p className="eyebrow">Public-data boundary</p>
          <h2>No private or clinical records</h2>
          <p>
            Only license-verified public neurophysiology data or clearly labeled
            synthetic data belong in this project. Protected health information,
            client records, private URLs, credentials, and identifiable
            participant information are out of scope.
          </p>
        </article>
      </section>

      <section className="surface" aria-labelledby="disclaimer-heading">
        <p className="eyebrow">Project disclaimer</p>
        <h2 id="disclaimer-heading">Educational and technical demonstration</h2>
        <p>
          This project does not provide medical diagnosis, clinical
          recommendations, treatment guidance, or validated patient-level
          predictions. It is not a laboratory, medical device, institutional
          research platform, or published study.
        </p>
        <div className="button-row">
          <Link href="/limitations">Read every limitation</Link>
          <Link href="/notebooks">Inspect reproducibility</Link>
        </div>
      </section>
    </main>
  );
}
