import type { Metadata } from "next";
import { PipelineExplorer } from "../components/PipelineExplorer";

export const metadata: Metadata = {
  title: "Complete scientific pipeline",
  description:
    "Inspect every input, transformation, output, limitation, code boundary, and provenance record in the NeuroStack Explorer workflow.",
};

export default function PipelinePage() {
  return <main id="main-content"><PipelineExplorer /></main>;
}
