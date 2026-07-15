export const limitationGroups = [
  {
    title: "Data",
    items: [
      "The verified public derivative represents one 600-second Long Evans rat MEC LII session from DANDI 000582@0.251111.2151; it cannot represent other animals, species, regions, tasks, laboratories, or recording systems.",
      "The compact derivative selects LED1 x/y and eight sorted units and omits LFP, raw acquisition data, a second LED, ambiguous subject weight, and other source content; it is not the untouched NWB asset.",
      "The 20 ms source position stream is deterministically decimated to 100 ms, and fixed spike binning removes temporal detail.",
      "The seeded synthetic fallback verifies software behavior but cannot establish biological truth.",
    ],
  },
  {
    title: "Analysis",
    items: [
      "Tuning curves and correlograms are descriptive. They do not establish causal mechanisms or synaptic connectivity.",
      "Binning, decimation, epoch selection, normalization, and behavioral-variable definitions can materially change apparent structure. Descriptive speed uses sample-centered finite differences on 10 Hz positions, with one-sided endpoints and no smoothing; the predictive lane instead uses trailing-only speed.",
      "Temporal dependence requires blocked evaluation; random row splits may overstate generalization.",
      "Any missing, uncertain, or weakly occupied region must remain visible in both charts and interpretation.",
    ],
  },
  {
    title: "Models",
    items: [
      "The computed model artifact covers only t1c1, one four-feature task, and one frozen chronological split; its final-test deviances are demonstration results, not stable benchmark rankings.",
      "Predictive performance does not imply causality, mechanistic truth, or understanding of the brain.",
      "The Stan posterior depends on a Poisson-log likelihood, explicit priors, and every-fifth-row training subsample; good sampler diagnostics do not establish model adequacy or prior robustness.",
      "The BridgeStan surface is an illustrative interface demonstration, not a result from the primary neurophysiology dataset.",
      "plenoptic model similarity is model-dependent and is not proof of human perceptual equivalence.",
    ],
  },
  {
    title: "Execution and performance",
    items: [
      "The public site does not execute arbitrary Python, run an unrestricted notebook kernel, train models, or perform Stan sampling on demand.",
      "Every browser output is precomputed or a bounded client-derived view; controls that filter or transform an artifact must disclose that distinction.",
      "The published mean Poisson deviances come from versioned precomputed artifacts; no runtime, GPU, causal, population-level, or production-performance claim follows from them.",
      "Remote archives and heavy visualization bundles may fail or load slowly, so static and synthetic fallbacks are part of the product contract.",
    ],
  },
  {
    title: "Clinical, authorship, and institutional boundaries",
    items: [
      "NeuroStack Explorer is an educational technical demonstration, not a medical device, diagnostic service, treatment tool, validated patient model, laboratory, or published study.",
      "No output should guide diagnosis, treatment, risk assessment, or patient-level decisions.",
      "Fatgezim “Zim” Bela is the author of this demonstration, not the creator of the listed open-source libraries or the owner of third-party public datasets.",
      "No private data, protected health information, client records, institutional secrets, or identifiable participant information belongs in the repository.",
    ],
  },
] as const;

export const unresolvedEvidence = [
  "Alternate chronological splits, uncertainty around final-test scores, and out-of-session evaluation",
  "Prior-sensitivity analysis, replicated posterior-predictive checks across sessions, and fuller calibration assessment beyond the recorded held-out check",
  "Independent scientific review of feature choices, model adequacy, and biological interpretation",
  "A reviewed release Git commit, complete accessibility and browser QA evidence, and an approved deployment record",
] as const;
