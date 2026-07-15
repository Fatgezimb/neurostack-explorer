export type ArtifactOrigin = "public-derived" | "synthetic";

export type BasisExplorer = {
  status: string;
  usedInFrozenFit: boolean;
  disclosure: string;
  inputGrid: number[];
  inputUnit: string;
  software: Record<string, string>;
  configurations: Array<{
    id: string;
    basisType: string;
    nBasisFunctions: number;
    featureNames: string[];
    parameters: Record<string, unknown>;
    curves: Array<{ feature: string; values: number[] }>;
    designMatrixSample: { input: number[]; rows: number[][] };
  }>;
};

export type CrossValidationAudit = {
  strategy: string;
  alphaGrid: number[];
  outerTrainingRows: number[];
  selectedAlpha: number;
  selectionMetric: string;
  selectionRule: string;
  folds: Array<{
    id: string;
    preprocessing: string;
    rowConvention: string;
    trainRows: number[];
    validationRows: number[];
    results: Array<{ alpha: number; iterations: number; meanPoissonDeviance: number }>;
  }>;
  summary: Array<{ alpha: number; foldDeviances: number[]; meanPoissonDeviance: number }>;
};

export type ArchitectureComparison = {
  id: string;
  label: string;
  architecture: number[];
  parameterCount: number;
  weightDecay: number;
  selected: boolean;
  bestEpoch: number;
  completedEpochs: number;
  seed: number;
  device: string;
  deterministicAlgorithms: boolean;
  validationMetricValue: number;
  finalTestMetricValue: number;
  trainingCheckpoints: Array<{ epoch: number; trainingPoissonNll: number; validationPoissonNll: number; selectedCheckpoint?: boolean }>;
};

export type PosteriorPredictiveCheck = {
  kind: string;
  disclosure: string;
  seed: number;
  posteriorDrawCount: number;
  heldOutSampleCount: number;
  displayStride: number;
  displayRows: number[];
  predictiveCountMedian: number[];
  predictiveCountQ05: number[];
  predictiveCountQ95: number[];
  intervalCoverage: { interval: string; coveredRows: number; totalRows: number; rate: number };
  totalCount: { observed: number; median: number; q05: number; q95: number };
};

export type ModelArtifact = {
  label: string;
  observed: number[];
  predicted: number[];
  metricLabel: string;
  metricValue: number | null;
  origin: ArtifactOrigin | "illustrative";
  execution: "precomputed" | "client-derived";
  status: string;
  disclosure?: string;
  artifactAvailable?: boolean;
  coefficients?: number[];
  intercept?: number[];
  configuration?: Record<string, unknown>;
  software?: Record<string, string>;
  heldOutSampleCount?: number;
  displayStride?: number;
  validationSampleCount?: number;
  validationMetricLabel?: string;
  validationMetricValue?: number;
  validationUse?: string;
  trainingCheckpoints?: Array<{ epoch: number; trainingPoissonNll: number; validationPoissonNll: number }>;
  activationExample?: {
    testRow: number;
    featureOrder: string[];
    standardizedInput: number[];
    hiddenPreActivation: number[];
    hiddenActivation: number[];
    outputPreActivation: number;
    predictedCount: number;
  };
  posteriorSummary?: Array<{ parameter: string; mean: number; median: number; q05: number; q95: number; rHat: number; essBulk: number }>;
  posteriorDrawSamples?: {
    kind: string;
    drawStride: number;
    sourceDrawCount: number;
    displayDrawCount: number;
    parameters: Array<{ parameter: string; values: number[] }>;
    disclosure: string;
  };
  diagnostics?: { divergentTransitions?: number; maxRHat?: number; minBulkEss?: number };
  basisExplorer?: BasisExplorer;
  crossValidation?: CrossValidationAudit;
  baseline?: {
    label: string;
    configuration: string;
    disclosure: string;
    trainingMeanCount: number;
    validationMetricValue: number;
    finalTestMetricValue: number;
  };
  architectureComparisons?: ArchitectureComparison[];
  selectedArchitectureId?: string;
  selectionRule?: string;
  posteriorPredictiveCheck?: PosteriorPredictiveCheck;
};

export type DemoDataset = {
  metadata: {
    origin: ArtifactOrigin;
    datasetId: string;
    version: string;
    assetPath: string;
    assetUuid: string;
    sha256: string;
    license: string;
    species: string;
    brainRegion: string;
    durationSeconds: number;
    positionSampleIntervalSeconds: number;
    unitIds: string[];
    generatedAt: string;
  };
  position: {
    timestamps: number[];
    x: number[];
    y: number[];
    speed: number[];
    coordinateUnit: string;
    speedUnit: string;
    speedMethod: string;
  };
  units: Array<{ id: string; spikeTimes: number[] }>;
  derived: {
    binSizeSeconds: number;
    timeBins: number[];
    populationRate: number[];
    unitRates: number[][];
    tuning: { bins: number[]; occupancy: number[]; rate: number[] };
    isiBins: number[];
    isiCounts: number[];
    crossLagBins: number[];
    crossCounts: number[];
    embedding: { x: number[]; y: number[]; unitId: string[] };
  };
  models: Record<string, ModelArtifact>;
  accessibleSummaries: Record<string, string>;
};

const unitIds = Array.from({ length: 8 }, (_, index) => `synthetic-unit-${String(index + 1).padStart(2, "0")}`);

function gaussian(value: number, center: number, width: number) {
  return Math.exp(-0.5 * Math.pow((value - center) / width, 2));
}

export function createSyntheticFallback(): DemoDataset {
  const durationSeconds = 600;
  const timestamps = Array.from({ length: 601 }, (_, index) => index);
  const x = timestamps.map((time) => 48 + 34 * Math.sin(time / 41) + 12 * Math.sin(time / 9));
  const y = timestamps.map((time) => 51 + 31 * Math.cos(time / 53) + 10 * Math.sin(time / 14));
  const speed = timestamps.map((_, index) => {
    if (index === 0) return 0;
    return Math.hypot(x[index] - x[index - 1], y[index] - y[index - 1]);
  });

  const units = unitIds.map((id, unitIndex) => {
    const spikeTimes: number[] = [];
    for (let time = 0.25 + unitIndex * 0.07; time < durationSeconds; time += 0.43 + unitIndex * 0.027) {
      const modulated = time + 0.17 * Math.sin(time / (5.2 + unitIndex));
      if (((Math.floor(time * 10) + unitIndex * 7) % 9) < 6) spikeTimes.push(Number(modulated.toFixed(4)));
    }
    return { id, spikeTimes };
  });

  const timeBins = Array.from({ length: 300 }, (_, index) => index * 2);
  const unitRates = units.map((_, unitIndex) =>
    timeBins.map((time) => 2.4 + unitIndex * 0.32 + 2.1 * Math.max(0, Math.sin(time / (18 + unitIndex * 2) + unitIndex))),
  );
  const populationRate = timeBins.map((_, index) =>
    unitRates.reduce((sum, rates) => sum + rates[index], 0) / unitRates.length,
  );
  const tuningBins = Array.from({ length: 20 }, (_, index) => index * 0.025);
  const occupancy = tuningBins.map((speedValue) => 4 + 7 * gaussian(speedValue, 0.18, 0.09));
  const rate = tuningBins.map((speedValue) => 1.5 + 9 * gaussian(speedValue, 0.26, 0.07));
  const isiBins = Array.from({ length: 24 }, (_, index) => index * 0.025);
  const isiCounts = isiBins.map((value) => 82 * Math.exp(-value * 8) + 5 * Math.sin(value * 26) ** 2);
  const crossLagBins = Array.from({ length: 41 }, (_, index) => (index - 20) * 0.01);
  const crossCounts = crossLagBins.map((value) => 14 + 16 * gaussian(value, 0.04, 0.035) + 3 * Math.cos(value * 42));
  const embeddingX: number[] = [];
  const embeddingY: number[] = [];
  const embeddingUnitId: string[] = [];
  unitIds.forEach((id, unitIndex) => {
    for (let point = 0; point < 20; point += 1) {
      const angle = point * 0.64 + unitIndex * 0.71;
      embeddingX.push(Math.cos(angle) * (0.8 + unitIndex * 0.06) + unitIndex * 0.11);
      embeddingY.push(Math.sin(angle) * (0.6 + unitIndex * 0.04) + (unitIndex % 2) * 0.2);
      embeddingUnitId.push(id);
    }
  });

  const unavailableModel = (label: string): ModelArtifact => ({
    label,
    observed: [],
    predicted: [],
    metricLabel: "Held-out metric",
    metricValue: null,
    origin: "illustrative",
    execution: "precomputed",
    status: "Synthetic fixture · model not fitted",
    artifactAvailable: false,
    disclosure: "The fallback keeps the interface usable but does not contain a fitted model or performance result.",
  });

  return {
    metadata: {
      origin: "synthetic",
      datasetId: "SYNTHETIC:neurostack-emergency-fallback",
      version: "1.0.0",
      assetPath: "not applicable—generated in memory",
      assetUuid: "not applicable—synthetic fixture",
      sha256: "not applicable—no source asset",
      license: "Project-generated deterministic fixture",
      species: "Not applicable—synthetic fixture",
      brainRegion: "Not applicable—synthetic fixture",
      durationSeconds,
      positionSampleIntervalSeconds: 1,
      unitIds,
      generatedAt: "2026-07-14T00:00:00Z",
    },
    position: {
      timestamps,
      x,
      y,
      speed,
      coordinateUnit: "synthetic meters",
      speedUnit: "synthetic meters/second",
      speedMethod: "Trailing finite difference over the one-second synthetic fallback samples.",
    },
    units,
    derived: {
      binSizeSeconds: 2,
      timeBins,
      populationRate,
      unitRates,
      tuning: { bins: tuningBins, occupancy, rate },
      isiBins,
      isiCounts,
      crossLagBins,
      crossCounts,
      embedding: { x: embeddingX, y: embeddingY, unitId: embeddingUnitId },
    },
    models: {
      nemos: unavailableModel("NeMoS Poisson GLM"),
      sklearn: unavailableModel("scikit-learn PoissonRegressor"),
      pytorch: unavailableModel("PyTorch Poisson MLP"),
      stan: unavailableModel("Stan uncertainty lane"),
    },
    accessibleSummaries: {
      raster: "Eight synthetic spike trains span a 600-second support interval. Spike density varies over time and by unit.",
      heatmap: "Population firing-rate rows show repeated temporal modulation. Values are synthetic fallback rates in hertz.",
      behavior: "Synthetic x position, y position, and speed vary smoothly across the selected interval.",
      tuning: "The synthetic speed-tuning curve peaks near 0.26 meters per second; occupancy is shown separately to prevent interpreting poorly sampled bins as strong evidence.",
      isi: "The synthetic inter-spike interval distribution is right-skewed, with the largest mass at short positive intervals.",
      correlation: "The synthetic cross-correlogram has a broad peak near a positive 40 millisecond lag.",
      prediction: "Observed and predicted fallback counts follow the same broad pattern but differ at individual bins.",
      residual: "Residuals alternate around zero and are included to reveal local model mismatch.",
      embedding: "A two-dimensional illustrative embedding groups points by unit without implying anatomical distance.",
      comparison: "The fallback contains no fitted models or performance scores.",
    },
  };
}

export function isDemoDataset(value: unknown): value is DemoDataset {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DemoDataset>;
  return Boolean(
    candidate.metadata?.datasetId
      && candidate.position?.timestamps?.length
      && candidate.units?.length
      && candidate.derived?.timeBins?.length
      && Array.isArray(candidate.derived?.unitRates)
      && candidate.accessibleSummaries,
  );
}

const modelLabels: Record<string, string> = {
  nemos: "NeMoS Poisson GLM",
  sklearn: "scikit-learn PoissonRegressor",
  pytorch: "PyTorch Poisson MLP",
  stan: "Stan uncertainty lane",
};

function numberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number" && Number.isFinite(item)) : [];
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function normalizeModel(key: string, value: unknown): ModelArtifact {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const predictions = numberArray(candidate.predicted ?? candidate.predictions);
  const observed = numberArray(candidate.observed);
  const metrics = Array.isArray(candidate.metrics) ? candidate.metrics : [];
  const firstMetric = metrics.find((item) => item && typeof item === "object") as Record<string, unknown> | undefined;
  const directMetric = typeof candidate.metricValue === "number" && Number.isFinite(candidate.metricValue)
    ? candidate.metricValue
    : null;
  const nestedMetric = typeof firstMetric?.value === "number" && Number.isFinite(firstMetric.value)
    ? firstMetric.value
    : null;
  const rawCheckpoints = Array.isArray(candidate.trainingCheckpoints) ? candidate.trainingCheckpoints : [];
  const trainingCheckpoints = rawCheckpoints.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    return typeof entry.epoch === "number"
      && typeof entry.trainingPoissonNll === "number"
      && typeof entry.validationPoissonNll === "number"
      ? [{ epoch: entry.epoch, trainingPoissonNll: entry.trainingPoissonNll, validationPoissonNll: entry.validationPoissonNll }]
      : [];
  });
  const rawPosterior = Array.isArray(candidate.posteriorSummary) ? candidate.posteriorSummary : [];
  const posteriorSummary = rawPosterior.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    const values = [entry.mean, entry.median, entry.q05, entry.q95, entry.rHat, entry.essBulk];
    return typeof entry.parameter === "string" && values.every((itemValue) => typeof itemValue === "number" && Number.isFinite(itemValue))
      ? [{ parameter: entry.parameter, mean: entry.mean as number, median: entry.median as number, q05: entry.q05 as number, q95: entry.q95 as number, rHat: entry.rHat as number, essBulk: entry.essBulk as number }]
      : [];
  });
  const intercept = typeof candidate.intercept === "number"
    ? [candidate.intercept]
    : numberArray(candidate.intercept);
  const configuration = candidate.configuration && typeof candidate.configuration === "object" && !Array.isArray(candidate.configuration)
    ? candidate.configuration as Record<string, unknown>
    : undefined;
  const software = candidate.software && typeof candidate.software === "object" && !Array.isArray(candidate.software)
    ? Object.fromEntries(Object.entries(candidate.software as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    : undefined;
  const rawDiagnostics = candidate.diagnostics && typeof candidate.diagnostics === "object" && !Array.isArray(candidate.diagnostics)
    ? candidate.diagnostics as Record<string, unknown>
    : undefined;
  const diagnostics = rawDiagnostics ? {
    divergentTransitions: typeof rawDiagnostics.divergentTransitions === "number" ? rawDiagnostics.divergentTransitions : undefined,
    maxRHat: typeof rawDiagnostics.maxRHat === "number" ? rawDiagnostics.maxRHat : undefined,
    minBulkEss: typeof rawDiagnostics.minBulkEss === "number" ? rawDiagnostics.minBulkEss : undefined,
  } : undefined;
  const basisExplorer = recordValue(candidate.basisExplorer) as BasisExplorer | undefined;
  const crossValidation = recordValue(candidate.crossValidation) as CrossValidationAudit | undefined;
  const baseline = recordValue(candidate.baseline) as ModelArtifact["baseline"];
  const architectureComparisons = Array.isArray(candidate.architectureComparisons)
    ? candidate.architectureComparisons as ArchitectureComparison[]
    : undefined;
  const posteriorDrawSamples = recordValue(candidate.posteriorDrawSamples) as ModelArtifact["posteriorDrawSamples"];
  const posteriorPredictiveCheck = recordValue(candidate.posteriorPredictiveCheck) as PosteriorPredictiveCheck | undefined;
  const rawActivation = candidate.activationExample && typeof candidate.activationExample === "object" && !Array.isArray(candidate.activationExample)
    ? candidate.activationExample as Record<string, unknown>
    : undefined;
  const activationExample = rawActivation
    && typeof rawActivation.testRow === "number"
    && Array.isArray(rawActivation.featureOrder)
    && rawActivation.featureOrder.every((item) => typeof item === "string")
    && typeof rawActivation.outputPreActivation === "number"
    && typeof rawActivation.predictedCount === "number"
    ? {
      testRow: rawActivation.testRow,
      featureOrder: rawActivation.featureOrder as string[],
      standardizedInput: numberArray(rawActivation.standardizedInput),
      hiddenPreActivation: numberArray(rawActivation.hiddenPreActivation),
      hiddenActivation: numberArray(rawActivation.hiddenActivation),
      outputPreActivation: rawActivation.outputPreActivation,
      predictedCount: rawActivation.predictedCount,
    }
    : undefined;

  return {
    label: typeof candidate.label === "string" ? candidate.label : modelLabels[key] ?? key,
    observed,
    predicted: predictions,
    metricLabel: typeof candidate.metricLabel === "string"
      ? candidate.metricLabel
      : typeof firstMetric?.label === "string"
        ? firstMetric.label
        : "Held-out metric",
    metricValue: directMetric ?? nestedMetric,
    origin: candidate.origin === "public-derived" || candidate.origin === "synthetic" ? candidate.origin : "illustrative",
    execution: candidate.execution === "client-derived" ? "client-derived" : "precomputed",
    status: typeof candidate.status === "string" ? candidate.status : "status unavailable",
    disclosure: typeof candidate.disclosure === "string" ? candidate.disclosure : undefined,
    artifactAvailable: typeof candidate.artifactAvailable === "boolean" ? candidate.artifactAvailable : predictions.length > 0,
    coefficients: numberArray(candidate.coefficients),
    intercept,
    configuration,
    software,
    heldOutSampleCount: typeof candidate.heldOutSampleCount === "number" ? candidate.heldOutSampleCount : undefined,
    displayStride: typeof candidate.displayStride === "number" ? candidate.displayStride : undefined,
    validationSampleCount: typeof candidate.validationSampleCount === "number" ? candidate.validationSampleCount : undefined,
    validationMetricLabel: typeof candidate.validationMetricLabel === "string" ? candidate.validationMetricLabel : undefined,
    validationMetricValue: typeof candidate.validationMetricValue === "number" ? candidate.validationMetricValue : undefined,
    validationUse: typeof candidate.validationUse === "string" ? candidate.validationUse : undefined,
    trainingCheckpoints,
    activationExample,
    posteriorSummary,
    posteriorDrawSamples,
    diagnostics,
    basisExplorer,
    crossValidation,
    baseline,
    architectureComparisons,
    selectedArchitectureId: typeof candidate.selectedArchitectureId === "string" ? candidate.selectedArchitectureId : undefined,
    selectionRule: typeof candidate.selectionRule === "string" ? candidate.selectionRule : undefined,
    posteriorPredictiveCheck,
  };
}

function normalizedSummaries(value: Record<string, unknown>, origin: ArtifactOrigin, unitCount: number) {
  const provided = value.accessibleSummaries;
  if (provided && typeof provided === "object" && !Array.isArray(provided)) {
    return provided as Record<string, string>;
  }
  const prefix = origin === "public-derived" ? "The public-derived artifact" : "The deterministic synthetic fallback";
  return {
    raster: `${prefix} contains spike times for ${unitCount} units across the declared session support.`,
    heatmap: `${prefix} shows unit firing rates by elapsed time in hertz.`,
    behavior: `${prefix} shows derived speed against elapsed time; inspect the data record for coordinate and speed units.`,
    tuning: `${prefix} pairs each tuning-rate bin with occupancy so sparsely sampled bins are not presented as strong evidence.`,
    isi: `${prefix} shows an inter-spike interval histogram for the named unit and declared interval range.`,
    correlation: `${prefix} shows a cross-correlogram for the named unit pair with lag units attached.`,
    prediction: "A held-out prediction trace appears only when the selected model artifact contains observed and predicted counts.",
    residual: "Residuals appear only when the selected model artifact contains aligned observed and predicted held-out counts.",
    embedding: `${prefix} includes a two-dimensional descriptive embedding; distance does not imply anatomy or causality.`,
    comparison: "Comparable scores appear only for fitted artifacts that share the declared target, split, and metric definition.",
  };
}

export function normalizeDemoDataset(value: unknown): DemoDataset | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const metadata = source.metadata as Record<string, unknown> | undefined;
  const position = source.position as Record<string, unknown> | undefined;
  const derived = source.derived as Record<string, unknown> | undefined;
  if (!metadata || !position || !derived || !Array.isArray(source.units)) return null;

  const timestamps = numberArray(position.timestamps);
  const timeBins = numberArray(derived.timeBins);
  const unitIds = Array.isArray(metadata.unitIds) ? metadata.unitIds.filter((item): item is string => typeof item === "string") : [];
  if (!timestamps.length || !timeBins.length || !unitIds.length) return null;

  const rawUnitRates = derived.unitRates;
  const unitRates = Array.isArray(rawUnitRates)
    ? rawUnitRates.map(numberArray)
    : rawUnitRates && typeof rawUnitRates === "object"
      ? unitIds.map((id) => numberArray((rawUnitRates as Record<string, unknown>)[id]))
      : [];
  if (unitRates.length !== unitIds.length || unitRates.some((rates) => rates.length === 0)) return null;

  const datasetIdValue = typeof metadata.datasetId === "string" ? metadata.datasetId : "";
  const versionFromId = datasetIdValue.match(/DANDI:(\d+)\/(.+)$/);
  const normalizedDatasetId = versionFromId ? `DANDI:${versionFromId[1]}` : datasetIdValue;
  const sourceVersion = versionFromId?.[2] ?? (typeof metadata.sourceVersion === "string" ? metadata.sourceVersion : typeof metadata.version === "string" ? metadata.version : "unknown");
  const origin: ArtifactOrigin = metadata.origin === "public-derived" ? "public-derived" : "synthetic";
  const tuning = derived.tuning && typeof derived.tuning === "object" ? derived.tuning as Record<string, unknown> : {};
  const embedding = derived.embedding && typeof derived.embedding === "object" ? derived.embedding as Record<string, unknown> : {};
  const rawModels = source.models && typeof source.models === "object" ? source.models as Record<string, unknown> : {};

  const normalized: DemoDataset = {
    metadata: {
      origin,
      datasetId: normalizedDatasetId,
      version: sourceVersion,
      assetPath: typeof metadata.assetPath === "string" ? metadata.assetPath : "not recorded",
      assetUuid: typeof metadata.assetUuid === "string" ? metadata.assetUuid : "synthetic-no-asset",
      sha256: typeof metadata.sha256 === "string" ? metadata.sha256 : "synthetic-no-source-hash",
      license: typeof metadata.license === "string" ? metadata.license : "not recorded",
      species: typeof metadata.species === "string" ? metadata.species : "not recorded",
      brainRegion: typeof metadata.brainRegion === "string" ? metadata.brainRegion : "not recorded",
      durationSeconds: typeof metadata.durationSeconds === "number" ? metadata.durationSeconds : timestamps.at(-1) ?? 0,
      positionSampleIntervalSeconds: typeof metadata.positionSampleIntervalSeconds === "number" ? metadata.positionSampleIntervalSeconds : 0,
      unitIds,
      generatedAt: typeof metadata.generatedAt === "string" ? metadata.generatedAt : "not recorded",
    },
    position: {
      timestamps,
      x: numberArray(position.x),
      y: numberArray(position.y),
      speed: numberArray(position.speed),
      coordinateUnit: typeof position.coordinateUnit === "string" ? position.coordinateUnit : "unit not recorded",
      speedUnit: typeof position.speedUnit === "string" ? position.speedUnit : "unit not recorded",
      speedMethod: typeof position.speedMethod === "string" ? position.speedMethod : "method not recorded",
    },
    units: source.units.flatMap((unit) => {
      if (!unit || typeof unit !== "object") return [];
      const candidate = unit as Record<string, unknown>;
      return typeof candidate.id === "string" ? [{ id: candidate.id, spikeTimes: numberArray(candidate.spikeTimes) }] : [];
    }),
    derived: {
      binSizeSeconds: typeof derived.binSizeSeconds === "number" ? derived.binSizeSeconds : 1,
      timeBins,
      populationRate: numberArray(derived.populationRate),
      unitRates,
      tuning: { bins: numberArray(tuning.bins), occupancy: numberArray(tuning.occupancy), rate: numberArray(tuning.rate) },
      isiBins: numberArray(derived.isiBins),
      isiCounts: numberArray(derived.isiCounts),
      crossLagBins: numberArray(derived.crossLagBins),
      crossCounts: numberArray(derived.crossCounts),
      embedding: {
        x: numberArray(embedding.x),
        y: numberArray(embedding.y),
        unitId: Array.isArray(embedding.unitId) ? embedding.unitId.filter((item): item is string => typeof item === "string") : [],
      },
    },
    models: Object.fromEntries(["nemos", "sklearn", "pytorch", "stan"].map((key) => [key, normalizeModel(key, rawModels[key])])),
    accessibleSummaries: normalizedSummaries(source, origin, unitIds.length),
  };

  return isDemoDataset(normalized) ? normalized : null;
}

export async function loadDemoDataset(signal?: AbortSignal): Promise<DemoDataset> {
  const load = async (url: string) => {
    const response = await fetch(url, { signal, cache: "force-cache" });
    if (!response.ok) throw new Error(`Artifact request failed with ${response.status}`);
    const value: unknown = await response.json();
    const normalized = normalizeDemoDataset(value);
    if (!normalized) throw new Error("Artifact schema is invalid");
    return normalized;
  };

  try {
    return await load("/artifacts/v1/demo-dataset.json?sha=e56d1ded0dad948c");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    try {
      return await load("/artifacts/v1/synthetic-dataset.json?sha=ad63cff4be0401f2");
    } catch (fallbackError) {
      if (fallbackError instanceof DOMException && fallbackError.name === "AbortError") throw fallbackError;
      return createSyntheticFallback();
    }
  }
}
