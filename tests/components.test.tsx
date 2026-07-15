import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartDescription } from "../app/components/ChartDescription";
import { PlotlyFigure } from "../app/components/PlotlyFigure";
import { shouldHandleViewerArrowKey } from "../app/components/ScientificFigureViewer";
import { SiteHeader } from "../app/components/SiteHeader";
import { TableScroll } from "../app/components/TableScroll";
import { ToolMiniDemo } from "../app/components/ToolMiniDemo";

const plotlyMock = vi.hoisted(() => ({
  newPlot: vi.fn(async () => undefined),
  purge: vi.fn(),
}));

vi.mock("plotly.js-dist-min", () => ({ default: plotlyMock }));

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.dataset.theme = "light";
  document.documentElement.removeAttribute("style");
  plotlyMock.newPlot.mockClear();
  plotlyMock.purge.mockClear();
});

describe("accessible interactions", () => {
  it("advances a tool preview with an explicit button", () => {
    render(<ToolMiniDemo kind="raster" label="Pynapple miniature demonstration" seed={3} />);
    const button = screen.getByRole("button", { name: "Advance Pynapple miniature demonstration" });

    expect(button).toHaveTextContent("Step 1/3");
    expect(screen.getByText("8 checked-in spike trains")).toBeInTheDocument();
    fireEvent.click(button);
    expect(button).toHaveTextContent("Step 2/3");
    expect(screen.getByText("Pynapple 100 ms count verified")).toBeInTheDocument();
  });

  it("exposes a chart summary without relying on the chart renderer", () => {
    render(<ChartDescription summary="Eight units are shown over elapsed seconds." />);
    const button = screen.getByRole("button", { name: "Describe this chart" });
    const description = screen.getByText("Eight units are shown over elapsed seconds.");

    expect(description).not.toBeVisible();
    fireEvent.click(button);
    expect(description).toBeVisible();
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("gives horizontally scrollable tables a named keyboard region", () => {
    render(<TableScroll label="Scrollable validation values"><table><tbody><tr><td>value</td></tr></tbody></table></TableScroll>);

    expect(screen.getByRole("region", { name: "Scrollable validation values" })).toHaveAttribute("tabindex", "0");
  });

  it("reserves viewer arrow shortcuts for the viewer frame", () => {
    const viewer = document.createElement("section");
    const neutralChild = document.createElement("span");
    const range = document.createElement("input");
    range.type = "range";
    const tableRegion = document.createElement("div");
    tableRegion.tabIndex = 0;
    viewer.append(neutralChild, range, tableRegion);

    expect(shouldHandleViewerArrowKey(viewer, viewer)).toBe(true);
    expect(shouldHandleViewerArrowKey(neutralChild, viewer)).toBe(true);
    expect(shouldHandleViewerArrowKey(range, viewer)).toBe(false);
    expect(shouldHandleViewerArrowKey(tableRegion, viewer)).toBe(false);
  });

  it("re-renders Plotly with active theme tokens", async () => {
    const root = document.documentElement;
    root.style.setProperty("--teal", "#136f63");
    root.style.setProperty("--paper-inset", "#e8ede7");
    root.style.setProperty("--ink-soft", "#42524c");
    const spec = {
      data: [{ line: { color: "#136f63" }, type: "scatter", x: [0, 1], y: [1, 2] }],
      layout: { xaxis: { title: { text: "Time" } }, yaxis: { title: { text: "Rate" } } },
      summary: "Two theme-aware points.",
      accessibleTable: { caption: "Theme test values.", columns: ["Time", "Rate"], rows: [[0, 1], [1, 2]] },
    };

    render(<PlotlyFigure spec={spec} />);
    await waitFor(() => expect(plotlyMock.newPlot).toHaveBeenCalledTimes(1));

    root.style.setProperty("--teal", "#73d4c0");
    root.style.setProperty("--paper-inset", "#1a2925");
    root.style.setProperty("--ink-soft", "#c2d0ca");
    root.dataset.theme = "dark";
    await waitFor(() => expect(plotlyMock.newPlot).toHaveBeenCalledTimes(2));

    const calls = plotlyMock.newPlot.mock.calls as unknown as Array<[
      HTMLElement,
      Array<{ line?: { color?: string } }>,
      Record<string, unknown>,
      Record<string, unknown>,
    ]>;
    const [, data, layout] = calls.at(-1) ?? [];
    expect(data?.[0]?.line?.color).toBe("#73d4c0");
    expect(layout?.plot_bgcolor).toBe("#1a2925");
    expect(layout?.font).toMatchObject({ color: "#c2d0ca" });
  });

  it("opens, filters, and closes the command palette", () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Open command palette" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("open");
    const search = screen.getByRole("textbox", { name: "Search pages" });
    fireEvent.change(search, { target: { value: "BridgeStan" } });
    expect(within(dialog).getByRole("link", { name: /BridgeStan/ })).toHaveAttribute("href", "/tools/bridgestan");
    expect(within(dialog).queryByRole("link", { name: "Lab" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(dialog).not.toHaveAttribute("open");
  });

  it("persists the selected color theme", () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("neurostack-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toHaveAttribute("aria-pressed", "true");
  });
});
