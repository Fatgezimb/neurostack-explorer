"use client";

import { useId, useMemo, useState } from "react";
import { TableScroll } from "./TableScroll";

type Props = {
  summary: string;
  x?: number[];
  y?: number[];
  xLabel?: string;
  yLabel?: string;
};

export function ChartDescription({ summary, x = [], y = [], xLabel = "x", yLabel = "y" }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rows = useMemo(() => {
    const length = Math.min(x.length, y.length);
    if (!length) return [];
    const step = Math.max(1, Math.ceil(length / 20));
    return Array.from({ length: Math.ceil(length / step) }, (_, index) => index * step)
      .filter((index) => index < length)
      .map((index) => ({ index, x: x[index], y: y[index] }));
  }, [x, y]);
  return (
    <div>
      <button
        aria-controls={id}
        aria-expanded={open}
        className="button-quiet"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? "Hide description" : "Describe this chart"}
      </button>
      <div hidden={!open} id={id}>
        <p>{summary}</p>
        {rows.length ? (
          <TableScroll label="Scrollable representative chart values">
            <table>
              <caption>Representative chart values; up to 20 evenly spaced rows from {Math.min(x.length, y.length)} plotted points.</caption>
              <thead><tr><th scope="col">Index</th><th scope="col">{xLabel}</th><th scope="col">{yLabel}</th></tr></thead>
              <tbody>{rows.map((row) => <tr key={row.index}><th scope="row">{row.index}</th><td>{row.x.toFixed(4)}</td><td>{row.y.toFixed(4)}</td></tr>)}</tbody>
            </table>
          </TableScroll>
        ) : null}
      </div>
    </div>
  );
}
