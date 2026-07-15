import type { Metadata } from "next";
import Link from "next/link";
import { tools } from "@/app/content/tools";

export const metadata: Metadata = {
  title: "Technology stack",
  description:
    "Inspect the scientific role, data contract, reproducibility requirements, and limitations of twelve open neuroscience tools.",
};

const categories = [
  { id: "data", label: "Data standard", heading: "One shared data contract" },
  { id: "foundation", label: "Foundation", heading: "One reproducible foundation" },
  { id: "analysis", label: "Time-series analysis", heading: "One domain-aware analysis layer" },
  { id: "modeling", label: "Modeling", heading: "Six defined modeling roles" },
  { id: "communication", label: "Reproducibility and communication", heading: "Three ways to inspect and reproduce the work" },
] as const;

export default function ToolsPage() {
  return (
    <main className="page-shell" id="main-content">
      <header className="page-intro">
        <p className="eyebrow">Technology stack</p>
        <h1>Twelve tools, one inspectable workflow.</h1>
        <p>
          These are not logo cards. Each route explains what enters a tool,
          what it contributes, what exits, how its signature demonstration works,
          and which claims are supported by versioned artifacts.
        </p>
        <div className="button-row">
          <Link href="/methods">Read the methods</Link>
          <Link href="/sources">Audit the sources</Link>
          <Link href="/limitations">Understand the limits</Link>
        </div>
      </header>

      {categories.map((category) => {
        const categoryTools = tools.filter((tool) => tool.category === category.id);

        if (categoryTools.length === 0) return null;

        return (
          <section key={category.id} aria-labelledby={`${category.id}-heading`}>
            <p className="eyebrow">{category.label}</p>
            <h2 id={`${category.id}-heading`}>{category.heading}</h2>
            <div className="content-grid">
              {categoryTools.map((tool) => (
                <article className="surface" key={tool.slug}>
                  <p className="eyebrow">{tool.category}</p>
                  <h3>{tool.name}</h3>
                  <p>{tool.shortDescription}</p>
                  <dl>
                    <div>
                      <dt>Receives</dt>
                      <dd>{tool.stage.enters[0]}</dd>
                    </div>
                    <div>
                      <dt>Produces</dt>
                      <dd>{tool.stage.exits[0]}</dd>
                    </div>
                  </dl>
                  <Link href={`/tools/${tool.slug}`}>
                    Explore {tool.name}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <section className="surface" aria-labelledby="comparison-rule-heading">
        <p className="eyebrow">Scientific rule</p>
        <h2 id="comparison-rule-heading">Alignment before comparison</h2>
        <p>
          NeMoS, scikit-learn, and PyTorch are aligned around the same question:
          predicting t1c1&apos;s next 100 ms spike count from current x/y, trailing-only
          speed, and the current t1c1 count on one frozen chronological split. Stan
          retains a separate uncertainty role; BridgeStan validates the compiled
          density and gradient interface; plenoptic remains a distinct visual-model investigation.
        </p>
      </section>
    </main>
  );
}
