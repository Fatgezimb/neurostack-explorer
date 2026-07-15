import type { Metadata } from "next";
import { DataExplorer } from "../components/DataExplorer";

export const metadata: Metadata = {
  title: "Public NWB dataset",
  description:
    "Inspect the exact DANDI asset, license, checksum, public metadata, compact derivative, synthetic fallback, validation record, and NWB hierarchy used by NeuroStack Explorer.",
};

export default function DataPage() {
  return <main id="main-content"><DataExplorer /></main>;
}
