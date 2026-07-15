import type { Metadata } from "next";
import { ScientificFigureViewer } from "../components/ScientificFigureViewer";

export const metadata: Metadata = {
  title: "Scientific visualizations",
  description:
    "Explore one lazy-loaded interactive Plotly figure at a time, with persistent view state, metadata, accessible descriptions, source context, and a lightweight fallback.",
};

export default function VisualizationsPage() {
  return <main id="main-content"><ScientificFigureViewer /></main>;
}
