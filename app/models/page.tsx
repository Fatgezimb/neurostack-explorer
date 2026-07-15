import type { Metadata } from "next";
import { ModelComparison } from "../components/ModelComparison";

export const metadata: Metadata = {
  title: "Connected model comparison",
  description:
    "Compare an interpretable NeMoS GLM, leakage-aware scikit-learn baseline, small PyTorch network, and separate Stan uncertainty lane without forcing invalid score rankings.",
};

export default function ModelsPage() {
  return <main id="main-content"><ModelComparison /></main>;
}
