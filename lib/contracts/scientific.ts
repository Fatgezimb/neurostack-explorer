/**
 * Shared contracts for scientific content and generated artifacts.
 *
 * The contracts intentionally keep data origin separate from execution mode.
 * A public-derived result can be precomputed, for example, while a synthetic
 * fallback can be calculated in the browser. Conflating those ideas would make
 * provenance disclosures ambiguous.
 */

export const toolSlugs = [
  "python",
  "jupyterlab",
  "pynapple",
  "nemos",
  "plenoptic",
  "stan",
  "bridgestan",
  "figurl",
  "pytorch",
  "scikit-learn",
  "plotly",
  "nwb",
] as const;

export type ToolSlug = (typeof toolSlugs)[number];

export type EvidenceStatus =
  | "verified"
  | "pending-verification"
  | "not-applicable";

export type ArtifactStatus =
  | "available"
  | "pending-generation"
  | "specification-only";

export type DataOrigin =
  | "public-derived"
  | "synthetic"
  | "open-image"
  | "illustrative";

export type ExecutionMode = "precomputed" | "client-derived";

export type VerificationField<T> = Readonly<{
  status: EvidenceStatus;
  value?: T;
  note: string;
}>;

export interface DatasetProvenance {
  id: string;
  title: VerificationField<string>;
  authors: VerificationField<readonly string[]>;
  repository: VerificationField<string>;
  permanentIdentifier: VerificationField<string>;
  license: VerificationField<string>;
  species: VerificationField<string>;
  brainRegion: VerificationField<string>;
  recordingModality: VerificationField<string>;
  selectedUnitsOrChannels: VerificationField<string>;
  behavioralVariables: VerificationField<readonly string[]>;
  selectedFilesOrSessions: VerificationField<readonly string[]>;
  transformations: VerificationField<readonly string[]>;
  accessDate: VerificationField<string>;
  containsPrivateOrClinicalData: false;
}

export interface ArtifactManifest {
  id: string;
  label: string;
  kind:
    | "dataset"
    | "notebook"
    | "chart"
    | "model"
    | "image"
    | "report"
    | "code";
  status: ArtifactStatus;
  origin: DataOrigin;
  execution: ExecutionMode;
  generatedBy: string;
  version: string;
  seed?: number;
  path?: string;
  disclosure: string;
}

export interface DemoDataset {
  id: string;
  label: string;
  origin: DataOrigin;
  provenanceId: string;
  timeUnit: "seconds" | "milliseconds";
  responseUnit: "spike count" | "spikes/second" | "arbitrary units";
  variables: readonly Readonly<{
    key: string;
    label: string;
    unit: string;
    role: "time" | "behavior" | "neural" | "condition";
  }>[];
  disclosure: string;
}

export interface ChartSpec {
  id: string;
  title: string;
  purpose: string;
  chartType:
    | "raster"
    | "line"
    | "heatmap"
    | "histogram"
    | "scatter"
    | "interval"
    | "surface"
    | "tree"
    | "diagram";
  xLabel: string;
  yLabel: string;
  origin: DataOrigin;
  execution: ExecutionMode;
  accessibleSummary: string;
}

export interface ModelRun {
  id: string;
  label: string;
  family: "glm" | "baseline" | "neural-network" | "bayesian" | "interface-demo";
  researchQuestion: string;
  target: string;
  inputs: readonly string[];
  assumptions: readonly string[];
  splitStrategy: string;
  evaluation: readonly string[];
  seed: number;
  origin: DataOrigin;
  execution: ExecutionMode;
  artifactStatus: ArtifactStatus;
  disclosure: string;
}

export interface ToolStage {
  enters: readonly string[];
  operation: readonly string[];
  exits: readonly string[];
  scientificValue: string;
}

export interface ToolVisual {
  title: string;
  description: string;
  interactions: readonly string[];
  fallback: string;
  dataDisclosure: string;
}

export interface CodePreview {
  title: string;
  language: string;
  status: ArtifactStatus;
  lines: readonly string[];
  disclosure: string;
}

export interface ToolRecord {
  slug: ToolSlug;
  name: string;
  category: "foundation" | "data" | "analysis" | "modeling" | "communication";
  shortDescription: string;
  purpose: string;
  stage: ToolStage;
  concepts: readonly Readonly<{
    title: string;
    explanation: string;
  }>[];
  visual: ToolVisual;
  code: CodePreview;
  reproducibility: readonly string[];
  limitations: readonly string[];
  nextTool?: ToolSlug;
  sourceId: ToolSlug;
}

export interface SourceReference {
  id: ToolSlug;
  toolName: string;
  verification: EvidenceStatus;
  website?: string;
  documentation?: string;
  repository?: string;
  license?: string;
  version?: string;
  accessDate?: string;
  citation?: string;
  note: string;
}

export interface NwbTreeNode {
  id: string;
  label: string;
  kind: "group" | "dataset" | "table" | "attribute";
  description: string;
  children?: readonly NwbTreeNode[];
}

export interface NotebookArtifact {
  id: string;
  title: string;
  status: ArtifactStatus;
  path?: string;
  kernel: string;
  sections: readonly Readonly<{
    order: number;
    title: string;
    purpose: string;
    expectedOutput: string;
  }>[];
  reproductionSteps: readonly string[];
  disclosure: string;
}

export interface LabState {
  datasetId: string;
  sessionId: string | null;
  selectedUnitIds: readonly string[];
  intervalSeconds: readonly [number, number];
  binSizeMilliseconds: number;
  smoothingWindowMilliseconds: number;
  modelId: string;
  showUncertainty: boolean;
  showTrainTestSplit: boolean;
  researchMode: boolean;
}

export function isToolSlug(value: string): value is ToolSlug {
  return (toolSlugs as readonly string[]).includes(value);
}

