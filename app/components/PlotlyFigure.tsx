"use client";

import { useEffect, useRef, useState } from "react";
import { TableScroll } from "./TableScroll";

type PlotlyModule = {
  newPlot: (element: HTMLElement, data: unknown[], layout: Record<string, unknown>, config: Record<string, unknown>) => Promise<void> | void;
  addFrames: (element: HTMLElement, frames: unknown[]) => Promise<void> | void;
  purge: (element: HTMLElement) => void;
};

type PlotHost = HTMLDivElement & {
  on?: (event: "plotly_relayout", handler: (value: Record<string, unknown>) => void) => void;
};

type ThemeName = "light" | "dark";

type PlotlyPalette = {
  amber: string;
  amberWash: string;
  blue: string;
  inkSoft: string;
  line: string;
  lineStrong: string;
  paperInset: string;
  rose: string;
  teal: string;
  tealDark: string;
  tealWash: string;
  violet: string;
};

function activeTheme(): ThemeName {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function token(styles: CSSStyleDeclaration, name: string, fallback: string) {
  return styles.getPropertyValue(name).trim() || fallback;
}

function readPlotlyPalette(): PlotlyPalette {
  const styles = getComputedStyle(document.documentElement);
  return {
    amber: token(styles, "--amber", "#805010"),
    amberWash: token(styles, "--amber-wash", "#f2e8d7"),
    blue: token(styles, "--blue", "#315f7d"),
    inkSoft: token(styles, "--ink-soft", "#42524c"),
    line: token(styles, "--line", "#cbd4ce"),
    lineStrong: token(styles, "--line-strong", "#879891"),
    paperInset: token(styles, "--paper-inset", "#e8ede7"),
    rose: token(styles, "--rose", "#99525e"),
    teal: token(styles, "--teal", "#136f63"),
    tealDark: token(styles, "--teal-dark", "#0b574e"),
    tealWash: token(styles, "--teal-wash", "#dbece7"),
    violet: token(styles, "--violet", "#65518f"),
  };
}

function themePlotlyValue(value: unknown, palette: PlotlyPalette): unknown {
  if (Array.isArray(value)) return value.map((item) => themePlotlyValue(item, palette));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, themePlotlyValue(item, palette)]),
    );
  }
  if (typeof value !== "string") return value;
  const replacements: Record<string, string> = {
    "#0b574e": palette.tealDark,
    "#136f63": palette.teal,
    "#315f7d": palette.blue,
    "#65518f": palette.violet,
    "#7bb8aa": palette.teal,
    "#805010": palette.amber,
    "#879891": palette.lineStrong,
    "#9b6420": palette.amber,
    "#dbece7": palette.tealWash,
    "#edf2ee": palette.paperInset,
    "rgba(155,100,32,.28)": palette.amberWash,
    "rgba(155,100,32,0.28)": palette.amberWash,
    "rgba(19,111,99,0.20)": palette.tealWash,
  };
  return replacements[value.toLowerCase()] ?? value;
}

function themedLayout(layout: Record<string, unknown>, palette: PlotlyPalette) {
  const next = themePlotlyValue(layout, palette) as Record<string, unknown>;
  for (const [key, value] of Object.entries(next)) {
    if (!/^[xyz]axis\d*$/.test(key) || !value || typeof value !== "object" || Array.isArray(value)) continue;
    next[key] = {
      ...(value as Record<string, unknown>),
      color: palette.inkSoft,
      gridcolor: palette.line,
      zerolinecolor: palette.lineStrong,
    };
  }
  if (next.scene && typeof next.scene === "object" && !Array.isArray(next.scene)) {
    const scene = next.scene as Record<string, unknown>;
    for (const axisName of ["xaxis", "yaxis", "zaxis"]) {
      const axis = scene[axisName];
      scene[axisName] = {
        ...(axis && typeof axis === "object" && !Array.isArray(axis) ? axis as Record<string, unknown> : {}),
        color: palette.inkSoft,
        gridcolor: palette.line,
        zerolinecolor: palette.lineStrong,
        backgroundcolor: palette.paperInset,
        showbackground: true,
      };
    }
    next.scene = scene;
  }
  return next;
}

export type PlotlyFigureSpec = {
  data: unknown[];
  frames?: unknown[];
  layout: Record<string, unknown>;
  summary: string;
  accessibleTable: {
    caption: string;
    columns: string[];
    rows: Array<Array<string | number>>;
  };
};

export function PlotlyFigure({
  spec,
  lightweight = false,
  onRangeSelect,
}: {
  spec: PlotlyFigureSpec;
  lightweight?: boolean;
  onRangeSelect?: (start: number, end: number) => void;
}) {
  const hostRef = useRef<PlotHost>(null);
  const plotlyRef = useRef<PlotlyModule | null>(null);
  const [status, setStatus] = useState("Loading interactive figure…");
  const [theme, setTheme] = useState<ThemeName>(() => activeTheme());

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setTheme(activeTheme());
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributeFilter: ["data-theme"], attributes: true });
    syncTheme();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || lightweight) return;
    let active = true;

    const render = async () => {
      try {
        const loaded = await import("plotly.js-dist-min");
        if (!active) return;
        const plotly = ((loaded as unknown as { default?: PlotlyModule }).default ?? loaded) as unknown as PlotlyModule;
        plotlyRef.current = plotly;
        const palette = readPlotlyPalette();
        await plotly.newPlot(host, themePlotlyValue(spec.data, palette) as unknown[], {
          ...themedLayout(spec.layout, palette),
          autosize: true,
          paper_bgcolor: "transparent",
          plot_bgcolor: palette.paperInset,
          colorway: [palette.teal, palette.blue, palette.violet, palette.amber, palette.rose],
          font: { family: "Geist, Arial, sans-serif", color: palette.inkSoft, size: 11 },
          hoverlabel: { bgcolor: palette.paperInset, bordercolor: palette.lineStrong, font: { color: palette.inkSoft } },
          margin: { l: 58, r: 24, t: 48, b: 54 },
        }, {
          responsive: true,
          displaylogo: false,
          modeBarButtonsToRemove: ["lasso2d", "select2d"],
          toImageButtonOptions: { format: "png", filename: "neurostack-figure", scale: 2 },
        });
        if (spec.frames?.length) {
          await plotly.addFrames(host, themePlotlyValue(spec.frames, palette) as unknown[]);
        }
        host.on?.("plotly_relayout", (value) => {
          const rawStart = value["xaxis.range[0]"];
          const rawEnd = value["xaxis.range[1]"];
          const start = typeof rawStart === "number" ? rawStart : Number(rawStart);
          const end = typeof rawEnd === "number" ? rawEnd : Number(rawEnd);
          if (onRangeSelect && Number.isFinite(start) && Number.isFinite(end) && end > start) {
            onRangeSelect(start, end);
          }
        });
        if (active) setStatus("Interactive Plotly figure ready.");
      } catch {
        if (active) setStatus("Interactive renderer unavailable. The accessible summary remains available.");
      }
    };

    void render();
    return () => {
      active = false;
      if (plotlyRef.current && host) plotlyRef.current.purge(host);
    };
  }, [spec, lightweight, onRangeSelect, theme]);

  const table = <TableScroll label={`Scrollable data table: ${spec.accessibleTable.caption}`}><table><caption>{spec.accessibleTable.caption}</caption><thead><tr>{spec.accessibleTable.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{spec.accessibleTable.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((value, columnIndex) => columnIndex === 0 ? <th key={columnIndex} scope="row">{typeof value === "number" ? value.toFixed(4) : value}</th> : <td key={columnIndex}>{typeof value === "number" ? value.toFixed(4) : value}</td>)}</tr>)}</tbody></table></TableScroll>;

  return (
    <div>
      {lightweight ? (
        <section aria-label="Lightweight chart alternative" className="notice">
          <strong>Lightweight view:</strong> {spec.summary}
          {table}
        </section>
      ) : (
        <>
          <div
            aria-label={spec.summary}
            aria-roledescription="interactive scientific chart"
            ref={hostRef}
            role="group"
            style={{ minHeight: "28rem", width: "100%" }}
          />
          <p aria-live="polite" className="fine-print">{status}</p>
          <details><summary>Describe this chart and inspect values</summary><p>{spec.summary}</p>{table}</details>
        </>
      )}
    </div>
  );
}
