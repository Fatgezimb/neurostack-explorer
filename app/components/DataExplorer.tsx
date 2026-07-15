"use client";

import { useEffect, useState } from "react";
import type { DemoDataset } from "../../lib/labData";
import { createSyntheticFallback, loadDemoDataset } from "../../lib/labData";
import styles from "./DataExplorer.module.css";

type Node = {
  id: string;
  label: string;
  kind: string;
  path: string;
  summary: string;
  fields: Array<[string, string]>;
};

const nodes: Node[] = [
  { id: "general", label: "general", kind: "metadata", path: "/general", summary: "Verified file-level metadata retained from the public source. The placeholder 1900 session_start_time is explicitly excluded from chronological claims.", fields: [["NWB identifier", "294b7de1-a624-44d8-b1a1-28028dd2cf0c"], ["archive session label", "17010302 (not interpreted as a date)"], ["analysis clock", "Elapsed session time"]] },
  { id: "subject", label: "subject", kind: "metadata", path: "/general/subject", summary: "Public, nonidentifying subject metadata required to interpret species and preparation.", fields: [["species", "Rattus norvegicus (Long Evans rat)"], ["subject_id", "10073"], ["privacy", "Public archive metadata only; ambiguous weight excluded"]] },
  { id: "acquisition", label: "acquisition", kind: "group", path: "/acquisition", summary: "The source acquisition group contains an ElectricalSeries. Its full sample payload remains in the pinned NWB source and is not bundled into the web derivative.", fields: [["source child", "ElectricalSeries"], ["web delivery", "Full acquisition samples not bundled"], ["validation", "Structure inspected from the checksum-matched source"]] },
  { id: "processing", label: "processing", kind: "group", path: "/processing", summary: "The source processing group contains behavior and ecephys modules. This project selects LED1 x/y position; it does not silently treat every stored series as an analysis input.", fields: [["source modules", "behavior · ecephys"], ["selected behavior", "Position / SpatialSeriesLED1"], ["sampling", "30,000 samples · 20 ms interval"]] },
  { id: "time-series", label: "time series", kind: "schema view", path: "/acquisition + /processing", summary: "The pinned source includes acquisition ElectricalSeries, processed LFP ElectricalSeries, and an LED1 SpatialSeries. Only LED1 position and unit spike times enter the compact browser artifact.", fields: [["acquisition", "ElectricalSeries · not served in full"], ["processed ecephys", "LFP / ElectricalSeriesLFP · not used in the model task"], ["selected behavior", "Position / SpatialSeriesLED1 · x/y only"], ["browser representation", "6,000 position samples at 0.10 s plus preserved unit spike times"]] },
  { id: "position", label: "Position", kind: "SpatialSeries", path: "/processing/behavior/Position", summary: "Public LED1 x/y positions over the 600-second session support. Descriptive speed is project-derived and not misrepresented as an untouched source field.", fields: [["source samples", "30,000 at 0.02 s"], ["web derivative", "6,000 at 0.10 s"], ["descriptive speed", "sample-centered finite differences; one-sided endpoints; no smoothing"], ["predictive speed", "separate trailing-only feature to prevent future leakage"]] },
  { id: "units", label: "units", kind: "DynamicTable", path: "/units", summary: "Eight sorted unit identifiers with ragged spike-time arrays. The compact derivative preserves the exact public identifiers.", fields: [["rows", "8"], ["IDs", "t1c1, t2c1, t2c3, t3c1, t3c2, t3c3, t3c4, t4c1"], ["time unit", "seconds"]] },
  { id: "electrodes", label: "electrodes", kind: "DynamicTable", path: "/general/extracellular_ephys/electrodes", summary: "The fetched source contains one electrode-table row. That table-row count is not generalized into an unsupported claim about acquisition-channel count.", fields: [["brain region", "Medial entorhinal cortex, layer II"], ["electrode table rows", "1"], ["channel-count claim", "Not inferred"]] },
  { id: "trials", label: "trials", kind: "absent", path: "/intervals/trials", summary: "This exact NWB asset has no trials table. NeuroStack Explorer does not invent trial labels; the analysis uses elapsed session time and explicitly declared chronological blocks.", fields: [["source trials table", "Absent"], ["analysis sample", "Fixed 100 ms elapsed-time bin"], ["model boundary", "Train · validation · 30 s gap · final test"]] },
  { id: "intervals", label: "intervals", kind: "absent", path: "/intervals", summary: "This exact asset has no intervals group. The primary demo therefore declares a 0–600 second support and visitor-selected subintervals without presenting them as source-authored epochs.", fields: [["source intervals group", "Absent"], ["default support", "0–600 s"], ["browser selection", "User-selected display interval; not written back to NWB"]] },
  { id: "validation", label: "validation", kind: "report", path: "/artifacts/v1/validation-report.json", summary: "The checksum-matched source passed PyNWB schema validation with zero errors. NWB Inspector completed with four retained findings; validation does not erase or silently repair them.", fields: [["PyNWB", "3.1.3 · passed · 0 schema errors"], ["NWB Inspector", "0.7.2 · completed with 4 findings"], ["retained caveats", "placeholder start time · regular timestamps · unit resolution · ambiguous weight"], ["derivative checks", "finite ordered timestamps · in-support spikes · expected samples and unit IDs"]] },
  { id: "stimulus", label: "stimulus", kind: "group", path: "/stimulus", summary: "No verified image-stimulus stream is used from this MEC asset. The plenoptic module therefore uses a separate visual-input branch.", fields: [["plenoptic relation", "Separate branch"], ["claim boundary", "No fake ephys-to-image continuation"]] },
];

export function DataExplorer() {
  const [selected, setSelected] = useState(nodes[0]);
  const [dataset, setDataset] = useState<DemoDataset>(() => createSyntheticFallback());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    loadDemoDataset(controller.signal).then((value) => { setDataset(value); setLoading(false); }).catch(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <div className="page-shell">
      <header className="page-intro">
        <p className="eyebrow">Data / exact public source</p>
        <h1>A small NWB session with complete provenance.</h1>
        <p>
          NeuroStack Explorer uses one immutable published asset from DANDI 000582. The 15,657,857-byte source is
          fetched only in the offline analysis workflow; visitors receive a measured compact derivative or an explicitly synthetic fallback.
        </p>
        <div className="button-row">
          <a className="button" href="https://dandiarchive.org/dandiset/000582/0.251111.2151" rel="noopener noreferrer" target="_blank">View dataset source<span className="visually-hidden"> (opens in a new tab)</span></a>
          <a className="button-secondary" href="#provenance">View provenance</a>
          <a className="button-quiet" href="/methods#data-derivative">View conversion method</a>
        </div>
      </header>

      <section className={styles.sourceRecord} id="provenance">
        <div className={styles.recordHead}>
          <div><p className="eyebrow">Published source record</p><h2>Conjunctive Representation of Position, Direction, and Velocity in Entorhinal Cortex</h2></div>
          <span className="status-pill" data-tone="public">CC BY 4.0</span>
        </div>
        <dl className={styles.recordGrid}>
          <div><dt>Dandiset</dt><dd>000582 · published version 0.251111.2151</dd></div>
          <div><dt>Authors</dt><dd>Francesca Sargolini, Marianne Fyhn, Torkel Hafting, Bruce L. McNaughton, Menno P. Witter, May-Britt Moser, Edvard I. Moser, Haagen Waade, and Simon Ball</dd></div>
          <div><dt>DOI</dt><dd><a href="https://doi.org/10.48324/dandi.000582/0.251111.2151" rel="noopener noreferrer" target="_blank">10.48324/dandi.000582/0.251111.2151<span className="visually-hidden"> (opens in a new tab)</span></a></dd></div>
          <div><dt>Exact asset</dt><dd>sub-10073_ses-17010302_behavior+ecephys.nwb</dd></div>
          <div><dt>Asset UUID</dt><dd><code>2b9e441b-56bc-4be2-893e-0e02d22d239d</code></dd></div>
          <div><dt>SHA-256</dt><dd><code>43b3b435b953d22e276acc494af2926b63deaf15d2834531b2a87d08a8458a09</code></dd></div>
          <div><dt>Species / region</dt><dd>Rattus norvegicus (Long Evans rat) · medial entorhinal cortex layer II</dd></div>
          <div><dt>Selected material</dt><dd>600 s · 30,000 LED1 x/y samples · eight sorted units</dd></div>
          <div><dt>Accessed</dt><dd>July 14, 2026</dd></div>
        </dl>
        <p className="notice"><strong>Source caveat:</strong> the file’s 1900-01-01 session start is a placeholder, not an acquisition date. It is never used as one.</p>
      </section>

      <section aria-labelledby="explorer-heading">
        <div className="section-intro"><p className="eyebrow">Read-only NWB explorer</p><h2 id="explorer-heading">Common schema, inspectable hierarchy.</h2><p>Select a node to inspect its role. The site accepts no visitor uploads and exposes only public allowlisted metadata.</p></div>
        <div className={styles.explorer}>
          <nav aria-label="NWB hierarchy" className={styles.tree}>
            <p className="mono">Source NWB 2.6.0 / validator schema 2.10.0</p>
            {nodes.map((node) => (
              <button aria-pressed={selected.id === node.id} key={node.id} onClick={() => setSelected(node)} type="button">
                <span aria-hidden="true">{node.kind === "group" ? "▾" : "◇"}</span><strong>{node.label}</strong><small>{node.kind}</small>
              </button>
            ))}
          </nav>
          <article aria-live="polite" className={styles.detail}>
            <p className="eyebrow">{selected.kind} / {selected.path}</p>
            <h2>{selected.label}</h2>
            <p>{selected.summary}</p>
            <dl>
              {selected.fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          </article>
        </div>
      </section>

      <section className={styles.delivery}>
        <article><p className="eyebrow">Browser artifact</p><h2>{loading ? "Checking local artifact…" : dataset.metadata.origin === "public-derived" ? "Public-derived artifact loaded" : "Synthetic fallback loaded"}</h2><p>The UI preserves origin independently from execution. Client filtering never changes a synthetic fixture into public-derived evidence.</p><span className="status-pill" data-tone={dataset.metadata.origin === "public-derived" ? "public" : "synthetic"}>{dataset.metadata.origin}</span></article>
        <article><p className="eyebrow">Derivative policy</p><h2>Compact, deterministic, checksummed.</h2><ul><li>Preserve all eight unit IDs and source spike times.</li><li>Retain full 600-second LED1 position support.</li><li>Derive speed and analysis arrays with fixed parameters.</li><li>Omit multi-gigabyte or unused source payloads.</li></ul></article>
        <article><p className="eyebrow">Validation</p><h2>Source and derivative checks.</h2><ul><li>Source SHA-256 matches.</li><li>PyNWB schema validation reports zero errors.</li><li>NWB Inspector’s four findings remain disclosed.</li><li>Timestamps, support, sample count, and unit IDs pass the derivative gates.</li></ul><a href="/artifacts/v1/validation-report.json">View validation report</a></article>
      </section>

      <section className="notice">
        <strong>Why NWB exists:</strong> a shared schema preserves richer metadata, enables reusable analysis, improves interoperability,
        and supports public archiving. A common file format does not by itself guarantee that an analysis is valid.
      </section>
    </div>
  );
}
