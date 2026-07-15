import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTool, tools } from "@/app/content/tools";
import { sourceRegistry } from "@/app/content/sources";
import { ToolSignatureVisual } from "@/app/components/ToolSignatureVisual";
import { isToolSlug, toolSlugs } from "@/lib/contracts";

type ToolPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return toolSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!isToolSlug(slug)) {
    return { title: "Tool not found" };
  }

  const tool = getTool(slug);
  return {
    title: tool.name,
    description: tool.shortDescription,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  if (!isToolSlug(slug)) notFound();

  const tool = getTool(slug);
  const currentIndex = tools.findIndex((candidate) => candidate.slug === tool.slug);
  const source = sourceRegistry.find((candidate) => candidate.id === tool.sourceId);
  const previousTool = currentIndex > 0 ? tools[currentIndex - 1] : null;
  const nextTool = tool.nextTool ? getTool(tool.nextTool) : null;

  return (
    <main className="page-shell" id="main-content">
      <header className="page-intro">
        <p className="eyebrow">{tool.category} / technology module</p>
        <h1>{tool.name}</h1>
        <p>{tool.shortDescription}</p>
        <div className="tag-list" aria-label="Evidence status">
          <span>Content: defined</span>
          <span>Artifact: {tool.code.status.replaceAll("-", " ")}</span>
          <span>Source: {source?.verification ?? "not recorded"} · {source?.version ?? "version not recorded"}</span>
        </div>
        <div className="button-row">
          <a href="#signature-visual">Inspect the demonstration</a>
          <Link href={`/sources#${tool.sourceId}`}>Review source status</Link>
          <Link href="/tools">All tools</Link>
        </div>
      </header>

      <section className="surface" aria-labelledby="purpose-heading">
        <p className="eyebrow">Role in the pipeline</p>
        <h2 id="purpose-heading">Why {tool.name} is here</h2>
        <p>{tool.purpose}</p>
      </section>

      <section aria-labelledby="contract-heading">
        <p className="eyebrow">Input → operation → output</p>
        <h2 id="contract-heading">Scientific stage contract</h2>
        <div className="content-grid">
          <article className="surface">
            <h3>What enters</h3>
            <ul>
              {tool.stage.enters.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article className="surface">
            <h3>What the stage does</h3>
            <ol>
              {tool.stage.operation.map((item) => <li key={item}>{item}</li>)}
            </ol>
          </article>
          <article className="surface">
            <h3>What exits</h3>
            <ul>
              {tool.stage.exits.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        </div>
        <p className="surface">
          <strong>Why this matters scientifically:</strong>{" "}
          {tool.stage.scientificValue}
        </p>
      </section>

      <section id="signature-visual" aria-labelledby="visual-heading">
        <p className="eyebrow">Signature demonstration</p>
        <h2 id="visual-heading">{tool.visual.title}</h2>
        <ToolSignatureVisual name={tool.name} slug={tool.slug} />
        <div className="content-grid">
          <article className="surface">
            <h3>Experience</h3>
            <p>{tool.visual.description}</p>
            <ol>
              {tool.visual.interactions.map((interaction) => (
                <li key={interaction}>{interaction}</li>
              ))}
            </ol>
          </article>
          <aside className="surface" aria-labelledby="fallback-heading">
            <h3 id="fallback-heading">Static and reduced-motion state</h3>
            <p>{tool.visual.fallback}</p>
            <h3>Data disclosure</h3>
            <p>{tool.visual.dataDisclosure}</p>
          </aside>
        </div>
      </section>

      <section aria-labelledby="concepts-heading">
        <p className="eyebrow">Core concepts</p>
        <h2 id="concepts-heading">What to inspect</h2>
        <div className="content-grid">
          {tool.concepts.map((concept) => (
            <article className="surface" key={concept.title}>
              <h3>{concept.title}</h3>
              <p>{concept.explanation}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="surface" aria-labelledby="code-heading">
        <p className="eyebrow">
          {tool.code.language} / {tool.code.status.replaceAll("-", " ")}
        </p>
        <h2 id="code-heading">{tool.code.title}</h2>
        <ol>
          {tool.code.lines.map((line) => (
            <li key={line}><code>{line}</code></li>
          ))}
        </ol>
        <p>{tool.code.disclosure}</p>
      </section>

      <section aria-labelledby="audit-heading">
        <p className="eyebrow">Reproducibility and limits</p>
        <h2 id="audit-heading">How to audit this module</h2>
        <div className="content-grid">
          <article className="surface">
            <h3>Reproducibility requirements</h3>
            <ul>
              {tool.reproducibility.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article className="surface">
            <h3>Interpretive limits</h3>
            <ul>
              {tool.limitations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        </div>
      </section>

      <nav className="surface" aria-label="Technology modules">
        <p className="eyebrow">Continue exploring</p>
        <div className="button-row">
          {previousTool ? (
            <Link href={`/tools/${previousTool.slug}`}>Previous: {previousTool.name}</Link>
          ) : (
            <Link href="/tools">Back to all tools</Link>
          )}
          {nextTool && (
            <Link href={`/tools/${nextTool.slug}`}>Next: {nextTool.name}</Link>
          )}
        </div>
      </nav>
    </main>
  );
}
