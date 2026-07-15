import type { Metadata } from "next";
import { LabWorkspace } from "../components/LabWorkspace";

export const metadata: Metadata = {
  title: "Neural-data analysis workspace",
  description:
    "Inspect linked spike, behavior, tuning, interval, correlation, prediction, residual, embedding, and model-comparison views backed by a compact NWB derivative or synthetic fallback.",
};

export default function LabPage() {
  return (
    <main id="main-content">
      <LabWorkspace />
    </main>
  );
}
