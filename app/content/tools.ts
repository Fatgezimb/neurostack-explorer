import type { ToolRecord, ToolSlug } from "@/lib/contracts";

/**
 * Editorial records for the twelve technology routes.
 *
 * Code previews are marked available only when the corresponding committed
 * script or implementation and its reviewed output exist. Computed scientific
 * artifacts remain distinct from illustrative interface demonstrations.
 */
export const tools = [
  {
    slug: "python",
    name: "Python",
    category: "foundation",
    shortDescription:
      "The typed orchestration layer that turns a documented NWB derivative into validated analysis and visualization artifacts.",
    purpose:
      "Python coordinates loading, validation, transformations, model preparation, artifact generation, and reproducibility metadata. Specialized neuroscience work remains attributed to the libraries that perform it.",
    stage: {
      enters: ["Pinned environment", "Validated dataset manifest", "Analysis configuration"],
      operation: [
        "Resolve explicit inputs and deterministic seeds",
        "Validate shapes, units, time support, and provenance",
        "Call version-locked scientific libraries",
        "Serialize browser-safe artifacts with a manifest",
      ],
      exits: ["Compact demo dataset", "Model artifacts", "Chart specifications", "Run manifest"],
      scientificValue:
        "A visible orchestration layer makes every transformation inspectable and prevents a chart from becoming detached from the code and data that produced it.",
    },
    concepts: [
      {
        title: "Typed boundaries",
        explanation:
          "The browser receives named variables, units, support intervals, origin labels, and artifact versions—not anonymous arrays.",
      },
      {
        title: "Deterministic runs",
        explanation:
          "Seeds, input identifiers, selected session, transformation parameters, and package versions belong in the run manifest.",
      },
      {
        title: "Cache by evidence",
        explanation:
          "Cache keys derive from source identity, analysis parameters, code version, and environment version rather than a filename alone.",
      },
      {
        title: "Small delivery surface",
        explanation:
          "The public site receives compact derived artifacts; full source NWB files stay in the documented archive or local analysis environment.",
      },
    ],
    visual: {
      title: "Data-transformation graph",
      description:
        "A line-to-stage walkthrough connects input validation, time-series conversion, feature construction, modeling, and serialization.",
      interactions: [
        "Select a pipeline node to inspect its input and output contract",
        "Move through the corresponding script stages with keyboard controls",
        "Inspect origin and execution disclosures for each artifact",
      ],
      fallback:
        "A numbered transformation list preserves the same information without animation or client scripting.",
      dataDisclosure:
        "The public-derived dataset, synthetic fallback, aligned models, BridgeStan surface, and plenoptic synthesis are precomputed by committed scripts and checksummed in the manifest.",
    },
    code: {
      title: "Verified artifact-generation path",
      language: "shell + Python",
      status: "available",
      lines: [
        "python scripts/build_artifacts.py --download --inspect",
        "verify DANDI version + UUID + path + 15,657,857 bytes + SHA-256",
        "build the 600 s derivative + seeded synthetic fallback + four aligned model outputs",
        "build separate BridgeStan + plenoptic demonstrations; write manifest + provenance + validation report",
      ],
      disclosure:
        "The committed pipeline completed on Python 3.12.13 and its deterministic artifacts validate against the recorded schemas and checksums.",
    },
    reproducibility: [
      "Pin Python and library versions in one environment lock",
      "Record a seed for every stochastic transformation or model",
      "Hash source identities, parameters, code, and outputs",
      "Fail generation when the pinned source size, SHA-256, schema, or required provenance differs",
    ],
    limitations: [
      "The public site does not execute arbitrary Python.",
      "No claim is made that Python alone performs library-specific neuroscience analysis.",
      "The pinned model runs prove execution only for their recorded versions, configuration, selected unit, and frozen split.",
    ],
    nextTool: "jupyterlab",
    sourceId: "python",
  },
  {
    slug: "jupyterlab",
    name: "JupyterLab",
    category: "communication",
    shortDescription:
      "A reproducible narrative joining provenance, executable analysis, equations, diagnostics, and interpretation.",
    purpose:
      "The notebook is the human-readable analysis record. It loads the checksum-gated local source, rebuilds bounded analysis objects, refits deterministic model lanes, and audits precomputed sampling without exposing a public execution kernel.",
    stage: {
      enters: ["Environment lock", "Checksum-matched cached NWB", "Dataset provenance", "Analysis modules and committed artifacts"],
      operation: [
        "Explain the research question before computing",
        "Load and validate the exact cached NWB source",
        "Build Pynapple objects and refit NeMoS, scikit-learn, and PyTorch",
        "Inspect the Stan posterior artifact and render a Plotly output",
        "Display outputs alongside assumptions and limitations",
        "Record execution metadata and artifact paths",
      ],
      exits: ["Executed 15-section notebook", "Reproduced deterministic model checks", "Plotly figure output", "Reproduction instructions", "Run record"],
      scientificValue:
        "Narrative, code, and results remain adjacent, making it easier to audit how a scientific claim follows from a transformation.",
    },
    concepts: [
      {
        title: "Narrative before output",
        explanation:
          "Each section states its question, inputs, transformation, and expected diagnostic before showing a result.",
      },
      {
        title: "Restart-and-run discipline",
        explanation:
          "The notebook must execute from a clean kernel in order; hidden state is treated as a reproducibility failure.",
      },
      {
        title: "Thin notebook",
        explanation:
          "Reusable transformations live in tested modules. Notebook cells orchestrate and explain them rather than hiding long one-off functions.",
      },
      {
        title: "Safe publication",
        explanation:
          "Visitors receive a read-only rendering and downloadable artifact, never an unrestricted server-side kernel.",
      },
    ],
    visual: {
      title: "Read-only notebook narrative",
      description:
        "A scrollable sequence pairs Markdown questions, concise code cells, scientific outputs, and disclosure blocks.",
      interactions: [
        "Jump between notebook sections",
        "Expand output summaries and provenance",
        "Inspect the committed executed artifact without exposing a public kernel",
      ],
      fallback:
        "The complete section outline and reproduction sequence remain readable as ordinary HTML.",
      dataDisclosure:
        "The committed notebook is executed and checksummed. It loads the exact cached NWB, constructs Pynapple objects, refits deterministic NeMoS, scikit-learn, and PyTorch lanes, and inspects rather than resamples the Stan posterior artifact.",
    },
    code: {
      title: "Notebook execution boundary",
      language: "text",
      status: "available",
      lines: [
        "python scripts/execute_notebook.py",
        "verify source bytes + derivative + manifest checksums",
        "load NWB; check 30,000 source positions + eight unit IDs",
        "build Pynapple objects; verify 6,000 aligned count bins",
        "refit three deterministic lanes; inspect Stan + render Plotly",
      ],
      disclosure:
        "The notebook executes top-to-bottom and fails on a cell error. No Binder, Colab, hosted JupyterLab server, or unrestricted public kernel is provided.",
    },
    reproducibility: [
      "Execute from a clean kernel in continuous integration",
      "Keep analysis code in importable, tested modules",
      "Store environment and artifact metadata beside the notebook",
      "Make failure visible rather than preserving stale cell output",
    ],
    limitations: [
      "There is no public notebook kernel.",
      "The notebook requires the checksum-matched source in the local cache and does not download it during execution.",
      "It refits the deterministic NeMoS, scikit-learn, and PyTorch lanes but does not rerun Stan sampling, BridgeStan compilation, or plenoptic synthesis.",
    ],
    nextTool: "nwb",
    sourceId: "jupyterlab",
  },
  {
    slug: "pynapple",
    name: "Pynapple",
    category: "analysis",
    shortDescription:
      "A neurophysiology time-series check that independently verifies the 100 ms t1c1 count sequence used by the model table.",
    purpose:
      "Pynapple represents the selected t1c1 event times on the explicit 0–600 s support, bins them at 100 ms, and checks equality with the committed next-bin modeling counts.",
    stage: {
      enters: ["Validated t1c1 spike times", "0–600 s interval support", "Fixed 100 ms bins"],
      operation: [
        "Represent t1c1 events on explicit time support",
        "Count events in the fixed 100 ms bins",
        "Align the count vector with the NumPy-derived model table",
        "Fail generation if any count differs",
      ],
      exits: ["Pynapple count vector", "Exact-equality check", "Recorded verification flag"],
      scientificValue:
        "A domain-aware independent count check makes the support and bin boundary explicit before the target enters four different model implementations.",
    },
    concepts: [
      {
        title: "Time support",
        explanation:
          "A value is interpreted together with the interval over which it is valid; gaps are not silently treated as continuous recording.",
      },
      {
        title: "Spike events",
        explanation:
          "Each selected unit is represented by event times. Binned counts and rates are derived views whose bin width must remain visible.",
      },
      {
        title: "Fixed support",
        explanation:
          "The executed check covers the full 0–600 s support. It does not claim trial or behavioral-state epoch analyses.",
      },
      {
        title: "Scope boundary",
        explanation:
          "The descriptive tuning, ISI, lag, and feature-map arrays are generated separately with PyNWB/NumPy, not Pynapple.",
      },
    ],
    visual: {
      title: "Binned-count verification",
      description:
        "The selected event train and interval support feed a 100 ms count vector that is compared element by element with the model table.",
      interactions: [
        "Inspect the selected t1c1 unit",
        "Inspect the fixed 100 ms bin definition",
        "Compare Pynapple and model-table counts",
        "Read the exact-equality result",
      ],
      fallback:
        "A static record lists the unit, interval, bin width, and successful equality check.",
      dataDisclosure:
        "PyNWB/NumPy generate the descriptive arrays. Pynapple 0.11.3 independently verifies the t1c1 binned-count sequence used by the aligned next-bin model task.",
    },
    code: {
      title: "Version-locked count verification",
      language: "Python",
      status: "available",
      lines: [
        "construct the 0–600 s Pynapple interval support",
        "bin t1c1 events into the same fixed 100 ms bins",
        "compare Pynapple counts with the committed model target table",
        "fail generation if any count differs",
      ],
      disclosure:
        "Pynapple 0.11.3 executed during model generation and its count comparison passed. It is not claimed as the generator of the separate descriptive tuning, ISI, lag, or feature-map arrays.",
    },
    reproducibility: [
      "Record unit identifiers and selected time support",
      "Store the 100 ms bin width and boundary convention",
      "Retain the event-to-count verification code",
      "Test timestamp ordering and interval boundaries",
    ],
    limitations: [
      "A matching count vector does not validate the downstream model assumptions.",
      "This executed check covers one unit and one binning convention.",
      "The executed Pynapple check covers the binned t1c1 count sequence, not every descriptive array or neuroscience API.",
      "To bound SVG work, the browser raster draws at most the first 700 events in a selected epoch; its spike total and rate calculation still use every selected event.",
    ],
    nextTool: "nemos",
    sourceId: "pynapple",
  },
  {
    slug: "nemos",
    name: "NeMoS",
    category: "modeling",
    shortDescription:
      "A systems-neuroscience Poisson GLM for the frozen t1c1 next-bin count task and chronological split.",
    purpose:
      "NeMoS fits the documented four-feature design matrix with a fixed Poisson Ridge configuration and exports coefficients, validation evidence, and final-test predictions.",
    stage: {
      enters: ["Next 100 ms unit-rate target", "Current-or-past covariates", "Chronological train/validation/test blocks"],
      operation: [
        "Build four current-or-past features without crossing held-out boundaries",
        "Standardize with training-block statistics only",
        "Fit Poisson Ridge 0.01 with an exponential inverse link and LBFGS",
        "Evaluate mean Poisson deviance on the frozen blocks",
      ],
      exits: ["Feature contract", "Coefficients and intercept", "Held-out predictions", "Validation and final-test deviance"],
      scientificValue:
        "The GLM supplies an interpretable comparison whose feature timing, link function, coefficients, split, and score can be inspected directly.",
    },
    concepts: [
      {
        title: "Aligned question",
        explanation:
          "The target is a selected unit’s firing rate in the next 100 ms bin; a count GLM can fit the equivalent next-bin spike count with 0.1-second exposure.",
      },
      {
        title: "Feature timing",
        explanation:
          "x, y, trailing-only speed, and current count are available by the current bin; no temporal basis expansion is used in this artifact.",
      },
      {
        title: "Count likelihood",
        explanation:
          "Predictions represent nonnegative spike intensity or expected count under an explicitly disclosed count-model assumption.",
      },
      {
        title: "Held-out trace",
        explanation:
          "Observed and predicted counts are stored every fifth test row for display, while the score uses every held-out row.",
      },
    ],
    visual: {
      title: "GLM design-matrix workbench",
      description:
        "The four named features flow through training-only scaling and fitted coefficients to observed and predicted held-out counts.",
      interactions: [
        "Inspect the frozen four-feature definition",
        "Inspect link function and Ridge strength",
        "Compare train and held-out time blocks",
        "Read coefficients beside their feature definitions",
      ],
      fallback:
        "A linear sequence explains feature construction, training-only scaling, link function, and final-test evaluation.",
      dataDisclosure:
        "The committed output reports validation mean Poisson deviance 0.759256 and final-test mean Poisson deviance 0.848559 on all 1,499 held-out rows. The 300-point trace is display-decimated only.",
    },
    code: {
      title: "Executed GLM configuration",
      language: "Python",
      status: "available",
      lines: [
        "target = t1c1 spike count in the next 100 ms bin",
        "features = current x, current y, trailing speed, current t1c1 count",
        "model = Poisson Ridge(0.01), exponential inverse link, LBFGS",
        "fit train [0,3600); evaluate test [4500,5999)",
      ],
      disclosure:
        "NeMoS 0.2.9 with JAX 0.10.1 executed in float64. Standardization was fit on training rows only; the fixed configuration reports validation but was not tuned on it.",
    },
    reproducibility: [
      "Version every feature definition and fixed model configuration",
      "Fit preprocessing only on the training interval",
      "Persist initialization, regularization, iterations, and seed",
      "Export prediction arrays so browser views never imply live fitting",
    ],
    limitations: [
      "A predictive association is not a causal mechanism.",
      "Poisson-style count assumptions may not capture every aspect of spike variability.",
      "This one-unit, one-recording, one-split result is precomputed and is not a population benchmark.",
    ],
    nextTool: "scikit-learn",
    sourceId: "nemos",
  },
  {
    slug: "plenoptic",
    name: "plenoptic",
    category: "modeling",
    shortDescription:
      "A separate visual-model demonstration using a project-generated procedural image and deterministic synthesis artifacts.",
    purpose:
      "plenoptic illustrates how a visual model can treat pixel-different images as representationally similar. It is conceptually adjacent to sensory neuroscience, but separate from the primary electrophysiology model comparison.",
    stage: {
      enters: ["Project-generated 24×24 grayscale image", "Fixed Gaussian visual model", "Fixed synthesis configuration"],
      operation: [
        "Compute a model representation",
        "Replay deterministic optimization checkpoints",
        "Compare pixel and representation differences",
        "Expose convergence history and stopping rule",
      ],
      exits: ["Synthesized image", "Difference views", "Representation comparison", "Optimization history"],
      scientificValue:
        "The comparison separates image appearance from the information retained by a chosen model, making model invariances open to inspection.",
    },
    concepts: [
      {
        title: "Model-dependent similarity",
        explanation:
          "Similarity is defined by the chosen representation; it is not a universal claim about human perception.",
      },
      {
        title: "Deterministic replay",
        explanation:
          "Expensive synthesis is generated offline with a fixed seed, then replayed from named checkpoints in the browser.",
      },
      {
        title: "Two difference spaces",
        explanation:
          "Pixel difference and representation difference answer different questions and should be shown together.",
      },
      {
        title: "Nonmedical input",
        explanation:
          "The demonstration uses a deterministic procedural image generated by this repository, with no external image or human-subject stimulus.",
      },
    ],
    visual: {
      title: "Stimulus-synthesis comparison",
      description:
        "Source, synthesis, pixel difference, representation difference, and optimization history share one checkpoint control.",
      interactions: [
        "Move between documented optimization checkpoints",
        "Switch between pixel and representation comparisons",
        "Inspect the fixed model, seed, and stopping rule",
      ],
      fallback:
        "A static comparison presents the first and final checkpoint with textual difference summaries.",
      dataDisclosure:
        "The source, synthesis, signed-difference image, and nine loss checkpoints are precomputed. No synthesis is represented as live browser computation.",
    },
    code: {
      title: "Executed synthesis configuration",
      language: "Python",
      status: "available",
      lines: [
        "source = deterministic 24×24 procedural grayscale image",
        "model = plenoptic.models.Gaussian(kernel_size=9, std=2), frozen",
        "synthesize with plenoptic.Metamer + Adam(lr=0.02, amsgrad=True)",
        "run 80 iterations; save checkpoints every 10 + PNG hashes",
      ],
      disclosure:
        "plenoptic 2.0.1 with PyTorch 2.12.1 executed in float64. Representation loss changed from 0.0660647005 to 0.0000371706; that model-space result is not a human-perception finding.",
    },
    reproducibility: [
      "Record the procedural source generator and no-external-image reuse status",
      "Pin model, optimizer, seed, and checkpoint schedule",
      "Retain the generation script and artifact hashes",
      "Distinguish offline synthesis from browser replay",
    ],
    limitations: [
      "Model equivalence does not establish human perceptual equivalence.",
      "The demonstration is not a validated human-subject experiment.",
      "The tiny procedural input and fixed Gaussian model are an interface demonstration, not a validated perceptual experiment.",
    ],
    nextTool: "stan",
    sourceId: "plenoptic",
  },
  {
    slug: "stan",
    name: "Stan",
    category: "modeling",
    shortDescription:
      "A Bayesian Poisson-log lane for the aligned t1c1 task, with explicit priors, coefficient summaries, sampler diagnostics, and a seeded held-out predictive check.",
    purpose:
      "Stan fits the same four-feature next-bin count question on a documented training subsample and reports coefficient summaries, posterior-mean held-out predictions, and predictive intervals from actual posterior draws.",
    stage: {
      enters: ["Aligned next-bin count table", "Four standardized predictors", "Prior specification", "Fixed seed"],
      operation: [
        "Define the Poisson-log likelihood and priors",
        "Fit every fifth training row offline",
        "Run two-chain convergence and effective-sample diagnostics",
        "Run a seeded posterior predictive simulation on the untouched final test",
        "Export compact coefficient and predictive summaries plus a deterministic every-fifth-draw display sample",
      ],
      exits: ["Posterior coefficient summaries", "Central 90% intervals", "Posterior-mean held-out predictions", "Held-out predictive check", "Convergence report"],
      scientificValue:
        "Posterior summaries make assumptions and coefficient uncertainty visible, while the retained diagnostics show whether this sampling run met its recorded numerical checks.",
    },
    concepts: [
      {
        title: "Priors are model inputs",
        explanation:
          "Prior width changes the model and must be justified, shown, and tested rather than hidden as a default.",
      },
      {
        title: "Credible intervals",
        explanation:
          "Intervals summarize posterior uncertainty under the specified model; they are not labeled confidence intervals.",
      },
      {
        title: "Compact predictive record",
        explanation:
          "The artifact retains coefficient summaries, posterior-mean predictions, deterministic posterior-predictive intervals, and 200 actual display draws per parameter; it does not ship every raw draw.",
      },
      {
        title: "Diagnostics before interpretation",
        explanation:
          "Convergence and sampling diagnostics accompany every reported posterior summary.",
      },
    ],
    visual: {
      title: "Posterior-summary studio",
      description:
        "Explicit priors link to coefficient intervals, posterior-mean held-out predictions, a predictive check, and convergence evidence.",
      interactions: [
        "Inspect the one committed prior specification",
        "Inspect posterior intervals without hiding distribution shape",
        "Compare observed and posterior-mean held-out traces",
        "Inspect held-out predictive intervals and the aggregate count check",
        "Read convergence evidence before interpretation",
      ],
      fallback:
        "A static posterior summary includes priors, medians, central 90% intervals, sampled-distribution summaries, diagnostics, predictive coverage, and the aggregate count check while naming the missing full draw set and prior-sensitivity analysis.",
      dataDisclosure:
        "Sampling used seed 20260714; posterior-predictive simulation used seed 20260815. The observed held-out total was 398 versus a predictive 90% interval of 428–581.1, and 1,443 of 1,499 row-level observations fell inside their empirical 90% intervals. These are model checks, not proof of calibration beyond this block.",
    },
    code: {
      title: "Executed Bayesian configuration",
      language: "Stan + Python",
      status: "available",
      lines: [
        "t1c1 next-bin count ~ poisson_log(alpha + X * beta)",
        "alpha ~ normal(-1, 1.5); beta ~ normal(0, 1)",
        "2 chains × (500 warmup + 500 sampling); training stride 5",
        "0 divergences; max R-hat 1.01129; minimum bulk ESS 887.091",
        "1,000 posterior-predictive draws; observed held-out total 398",
      ],
      disclosure:
        "CmdStanPy 1.3.0/CmdStan 2.39.0 executed the committed Poisson-log program. Final-test mean Poisson deviance is 0.850890 on all 1,499 rows; this depends on the likelihood, priors, and subsampled training fit.",
    },
    reproducibility: [
      "Commit the Stan program beside generated summaries",
      "Record seed, chains, warmup, draws, and toolchain version",
      "Record the separate predictive-simulation seed and interval definition",
      "Preserve the documented compact posterior derivative and generator",
      "Require convergence evidence before displaying intervals",
    ],
    limitations: [
      "Posterior conclusions depend on the likelihood and prior assumptions.",
      "Posterior probability does not imply clinical certainty.",
      "The recorded held-out predictive check covers one session block and does not replace prior-sensitivity or replicated calibration analysis.",
    ],
    nextTool: "bridgestan",
    sourceId: "stan",
  },
  {
    slug: "bridgestan",
    name: "BridgeStan",
    category: "modeling",
    shortDescription:
      "A clearly illustrative two-parameter interface demo for compiled-model log density and gradients.",
    purpose:
      "BridgeStan is shown as a lower-level model interface, separate from the primary scientific model. The demonstration explains how external analysis code can query a compiled Stan model at a parameter vector.",
    stage: {
      enters: ["Small illustrative Stan program", "Compiled model", "Two-parameter vector"],
      operation: [
        "Evaluate log density at the current parameters",
        "Evaluate the local gradient",
        "Propose a bounded optimizer step",
        "Compare current and proposed values",
      ],
      exits: ["Log-density value", "Gradient vector", "Proposed parameter vector", "Evaluation trace"],
      scientificValue:
        "The interface view reveals the numerical quantities an external optimizer or diagnostic can request without confusing that interface with Bayesian inference itself.",
    },
    concepts: [
      {
        title: "Compiled model boundary",
        explanation:
          "The Stan program is compiled before external code queries its log density and gradient functions.",
      },
      {
        title: "Local information",
        explanation:
          "A gradient describes local change at one point; it does not by itself characterize the full posterior surface.",
      },
      {
        title: "Constrained interaction",
        explanation:
          "Only two safe illustrative parameters are exposed, keeping the visualization interpretable and bounded.",
      },
      {
        title: "Separate scientific claim",
        explanation:
          "The surface is an interface teaching artifact, not evidence from the primary neural analysis.",
      },
    ],
    visual: {
      title: "Log-density surface and gradient explorer",
      description:
        "A point on a two-parameter surface is paired with its log density, gradient arrow, and a proposed optimizer step.",
      interactions: [
        "Adjust either illustrative parameter within fixed bounds",
        "Compare current and proposed locations",
        "Step through parameter-vector, density, gradient, and proposal stages",
      ],
      fallback:
        "A contour table lists representative parameter points, densities, gradients, and one deterministic update.",
      dataDisclosure:
        "BridgeStan 2.9.0 evaluated the committed compiled model on a 17×17 grid. The result is illustrative and separate from the DANDI recording.",
    },
    code: {
      title: "Executed interface demonstration",
      language: "Stan + Python",
      status: "available",
      lines: [
        "compile python/stan/bridge_surface.stan",
        "evaluate log density and gradients on a fixed 17×17 grid",
        "check analytic gradients against finite differences (epsilon 1e-6)",
        "save nine deterministic gradient-ascent evaluations",
      ],
      disclosure:
        "The finite-difference check passed with maximum absolute error 2×10⁻¹⁰. Jacobian is true and propto is false; the two unconstrained parameters have no biological meaning.",
    },
    reproducibility: [
      "Commit the exact illustrative Stan source",
      "Record BridgeStan and compiler versions",
      "Use a fixed parameter grid and deterministic update rule",
      "Test stored density and gradient values against regeneration",
    ],
    limitations: [
      "A two-parameter surface does not represent the complexity of the primary neural model.",
      "Gradient ascent is not presented as general-purpose posterior sampling.",
      "The generated density and gradient values demonstrate this exact compiled model only.",
    ],
    nextTool: "figurl",
    sourceId: "bridgestan",
  },
  {
    slug: "figurl",
    name: "Figurl / Scientific Figure Viewer",
    category: "communication",
    shortDescription:
      "An internal, read-only, Figurl-inspired scientific figure experience with bounded persistent view state.",
    purpose:
      "The default implementation is an internal Scientific Figure Viewer: linked panels, durable view state, metadata, annotations, code references, and keyboard navigation without claiming official Figurl integration.",
    stage: {
      enters: ["Versioned figure artifact", "Dataset provenance", "Panel metadata", "Serializable view state"],
      operation: [
        "Render linked scientific panels",
        "Persist bounded view state in the URL",
        "Attach annotations to stable panel coordinates",
        "Expose dataset, analysis version, and code references",
      ],
      exits: ["Shareable view URL", "Figure state", "Annotations", "Accessible panel summaries"],
      scientificValue:
        "A figure becomes a reproducible research object when the view state and analytical context travel with the visualization.",
    },
    concepts: [
      {
        title: "Accurate identity",
        explanation:
          "Figurl 0.3.1 package and hosting constraints were reviewed. The product is deliberately called Scientific Figure Viewer—not an official hosted Figurl instance.",
      },
      {
        title: "Persistent state",
        explanation:
          "Selected panel, interval, unit, and display options are encoded in a bounded, human-inspectable URL state.",
      },
      {
        title: "Linked panels",
        explanation:
          "A time or unit selection can coordinate related views where that linkage is scientifically defensible.",
      },
      {
        title: "Figure provenance",
        explanation:
          "Every shared view identifies its dataset source, analysis version, artifact status, and code reference.",
      },
    ],
    visual: {
      title: "Shareable multi-panel figure viewer",
      description:
        "One selected scientific figure and a linked unit-rate context panel share bounded unit, interval, annotation, renderer, and provenance state.",
      interactions: [
        "Move between panels by keyboard",
        "Select a bounded time range or unit",
        "Copy a URL only after view state is serialized",
        "Open annotations and panel descriptions",
      ],
      fallback:
        "Panels render in document order with their metadata and share state expressed as readable parameters.",
      dataDisclosure:
        "Direct Figurl hosting was not adopted because it depends on Kachery cloud and durable file ownership. The shipped viewer is internal and read-only.",
    },
    code: {
      title: "Viewer-state contract",
      language: "text",
      status: "available",
      lines: [
        "validate a versioned figure artifact and panel registry",
        "parse bounded view state from documented URL parameters",
        "link only panels with a shared scientific selection",
        "publish provenance, code reference, and text summaries",
      ],
      disclosure:
        "The internal viewer implementation is available and preserves bounded URL state. It does not claim an official Figurl embed, deployment, or hosted figure.",
    },
    reproducibility: [
      "Version figure artifacts independently of viewer code",
      "Validate all URL parameters and provide stable defaults",
      "Include analysis version and dataset identity in shared state",
      "Keep annotations non-destructive and exportable",
    ],
    limitations: [
      "The default viewer is not represented as an official Figurl deployment.",
      "Shared URLs reproduce view state, not a new scientific computation.",
      "The reviewed Figurl hosting model is not used; the internal viewer reproduces bounded view state only.",
    ],
    nextTool: "plotly",
    sourceId: "figurl",
  },
  {
    slug: "pytorch",
    name: "PyTorch",
    category: "modeling",
    shortDescription:
      "A deliberately small nonlinear model aligned to next-bin selected-unit rate prediction on the same chronological folds as the interpretable baselines.",
    purpose:
      "PyTorch demonstrates tensors, automatic differentiation, and a compact Poisson-output multilayer perceptron without implying that complexity guarantees better science.",
    stage: {
      enters: ["Training-only standardized covariates", "Next 100 ms unit-rate target", "Blocked chronological split"],
      operation: [
        "Construct typed tensors with visible shapes",
        "Train a small, regularized network with a fixed seed",
        "Track training and validation loss",
        "Evaluate predictions and mean Poisson deviance on the held-out block",
      ],
      exits: ["Three-candidate architecture record", "Validation-selected model", "Training checkpoints", "Held-out predictions", "Validation and final-test deviance"],
      scientificValue:
        "An aligned target allows a fairer comparison with the GLM and baseline while exposing when nonlinear capacity helps, fails, or overfits.",
    },
    concepts: [
      {
        title: "Visible tensor shapes",
        explanation:
          "Samples, features, hidden activations, and output dimensions are labeled so transformations can be audited.",
      },
      {
        title: "Nonnegative output",
        explanation:
          "The final parameterization is chosen for a nonnegative expected spike count rather than an unconstrained score.",
      },
      {
        title: "Predeclared capacity comparison",
        explanation:
          "The artifact compares a 4–1 softplus model, a 4–8–1 MLP, and a regularized 4–8–1 MLP. The lowest validation deviance selects the displayed lane before final-test results are used.",
      },
      {
        title: "Overfitting evidence",
        explanation:
          "Training and validation histories stay adjacent; a widening gap is shown as a warning, not hidden by the final checkpoint.",
      },
    ],
    visual: {
      title: "Neural-network data-flow inspector",
      description:
        "Input covariates move through three predeclared compact candidates; the selected architecture, checkpoints, and held-out predictions remain inspectable.",
      interactions: [
        "Compare the linear, MLP, and regularized-MLP candidates",
        "Inspect the validation-only selection rule",
        "Inspect the recorded training and validation checkpoints",
        "Open the aligned held-out prediction comparison",
        "Read the validation-only early-stopping record",
      ],
      fallback:
        "A layer table and paired loss/prediction summaries convey architecture and evaluation without motion.",
      dataDisclosure:
        "The model trained offline on CPU with deterministic operations and seed 20260714. The browser replays the committed held-out trace and does not train or claim GPU execution.",
    },
    code: {
      title: "Executed training configuration",
      language: "Python",
      status: "available",
      lines: [
        "standardize four features on train [0,3600) only",
        "train 4–1, 4–8–1, and regularized 4–8–1 CPU candidates",
        "select regularized 4–8–1 on validation only; best epoch 22",
        "weight decay 0.001; validation deviance 0.694164",
        "final-test deviance 0.778533 on the untouched 1,499 rows",
      ],
      disclosure:
        "PyTorch 2.12.1 executed on CPU with float64 and deterministic algorithms. The final metric uses all 1,499 test rows; the stored 300-point trace is display-decimated only.",
    },
    reproducibility: [
      "Record architecture, optimizer, learning rate, epochs, and seed",
      "Use deterministic operations where supported and disclose exceptions",
      "Keep preprocessing inside the training boundary",
      "Export the exact held-out predictions used in charts",
    ],
    limitations: [
      "A small public session cannot establish generalizable neural decoding or encoding performance.",
      "The neural network is not assumed superior to simpler models.",
      "The architecture comparison uses one validation block; no GPU or runtime claim is made, and one lower deviance on one split is not evidence of general superiority.",
    ],
    nextTool: "stan",
    sourceId: "pytorch",
  },
  {
    slug: "scikit-learn",
    name: "scikit-learn",
    category: "modeling",
    shortDescription:
      "A leakage-aware Poisson baseline and preprocessing pipeline aligned with the neural encoding task.",
    purpose:
      "scikit-learn provides a familiar baseline for preprocessing, blocked evaluation, coefficients, diagnostics, and comparison with the NeMoS and PyTorch lanes.",
    stage: {
      enters: ["Behavioral feature table", "Next 100 ms unit-rate target", "Chronological train/validation/test indices"],
      operation: [
        "Fit transformations only on training blocks",
        "Fit an interpretable count-regression baseline",
        "Select alpha with expanding-window folds contained entirely inside training",
        "Report outer validation only after the training-only selection is fixed",
        "Evaluate once on the held-out test block",
      ],
      exits: ["Training-only fold audit", "Intercept-only reference", "Fitted pipeline", "Coefficients", "Held-out predictions", "Validation and final-test deviance"],
      scientificValue:
        "A disciplined baseline shows whether additional complexity earns its place and makes leakage controls part of the visible scientific method.",
    },
    concepts: [
      {
        title: "Pipeline boundary",
        explanation:
          "This artifact performs scaling and fitting inside the training boundary; it has no imputation or feature-selection stage.",
      },
      {
        title: "Blocked evaluation",
        explanation:
          "Time-adjacent samples can be dependent, so random row shuffling may overstate generalization.",
      },
      {
        title: "Aligned baseline",
        explanation:
          "The baseline predicts the same selected unit’s next-bin firing rate, using the equivalent 100 ms count during count-model fitting.",
      },
      {
        title: "Training-only model selection",
        explanation:
          "Three expanding-window folds inside the outer training block compare four alpha values. Alpha 0.1 has the lowest mean fold deviance; outer validation and final test do not participate in selection.",
      },
    ],
    visual: {
      title: "Leakage-aware model workbench",
      description:
        "A split timeline feeds fold-local standardization, training-only alpha selection, an intercept-only reference, the selected PoissonRegressor, and held-out predictions.",
      interactions: [
        "Inspect where every transformation is fitted",
        "Compare the expanding training folds and alpha results",
        "Compare the selected model with the training-mean reference",
        "Read coefficient direction with feature units",
        "Compare aligned metrics only when artifact results exist",
      ],
      fallback:
        "A pipeline diagram and split table document the leakage boundary and evaluation sequence.",
      dataDisclosure:
        "Training-only cross-validation selected alpha 0.1. The selected model reports outer-validation deviance 0.764638 and final-test deviance 0.853491; the training-mean reference reports 0.900410 and 1.111981 respectively.",
    },
    code: {
      title: "Executed baseline configuration",
      language: "Python",
      status: "available",
      lines: [
        "reserve test [4500,5999) behind a 30 s gap",
        "compare alpha [0, 0.001, 0.01, 0.1] in 3 expanding training folds",
        "select alpha 0.1 without outer-validation or test input",
        "fit outer training; report validation; evaluate final test once",
        "export fold audit, intercept-only reference, coefficients, and predictions",
      ],
      disclosure:
        "scikit-learn 1.9.0 actually fit the baseline on the common next-bin task. The final-test metric uses all 1,499 rows and was not used for selection.",
    },
    reproducibility: [
      "Persist the exact temporal split indices",
      "Fit every learned transform inside the training fold",
      "Document the alpha grid, fold boundaries, selection rule, and naive reference",
      "Record seed, package version, feature order, and output hashes",
    ],
    limitations: [
      "The one frozen chronological split does not estimate alternate-split uncertainty.",
      "Coefficient magnitude is not automatically causal importance.",
      "The intercept-only reference adds context, but one alpha grid and one recording still do not establish generalization.",
    ],
    nextTool: "pytorch",
    sourceId: "scikit-learn",
  },
  {
    slug: "plotly",
    name: "Plotly",
    category: "communication",
    shortDescription:
      "A lazy-loaded scientific chart layer for linked exploration, precise labels, hover detail, and accessible summaries.",
    purpose:
      "Plotly presents analytical artifacts without changing their scientific meaning. Every view must name its variables, units, origin, execution mode, and accessible textual conclusion.",
    stage: {
      enters: ["Validated chart specification", "Versioned compact arrays", "Accessible summary"],
      operation: [
        "Render a chart suited to the analytical question",
        "Link selections only where variables share a valid key",
        "Expose hover detail and an equivalent keyboard-readable HTML table",
        "Offer export when the result and metadata can travel together",
      ],
      exits: ["Responsive interactive chart", "Selection state", "Text summary", "Export metadata"],
      scientificValue:
        "Linked charts help users inspect structure and diagnostics, while explicit labels keep interaction from becoming visual spectacle without analytical context.",
    },
    concepts: [
      {
        title: "Chart follows question",
        explanation:
          "Raster, heatmap, interval, held-out trace, and distribution views answer different questions; visual variety is not the goal.",
      },
      {
        title: "Units are content",
        explanation:
          "Seconds, milliseconds, spike counts, rates, and dimensionless model values stay visible in axes and summaries.",
      },
      {
        title: "Honest feature map",
        explanation:
          "The two-dimensional unit map shows z-scored mean rate and ISI coefficient of variation; it is not PCA or a learned embedding.",
      },
      {
        title: "Equivalent summary",
        explanation:
          "Every complex chart supplies a concise text account of the selected range, dominant pattern, and interpretive limit.",
      },
    ],
    visual: {
      title: "Linked scientific-chart gallery",
      description:
        "A raster and rate trace sit beside a heatmap, tuning interval, posterior summary, held-out trace, and descriptive unit feature map.",
      interactions: [
        "Brush time on linked temporal charts",
        "Inspect units and provenance in hover details",
        "Open the accessible description for each view",
        "Inspect the feature map’s exact two-axis definitions",
      ],
      fallback:
        "Static SVG or table summaries present the same variables, selections, and conclusions if the chart bundle is unavailable.",
      dataDisclosure:
        "Plotly is a rendering layer. Each chart retains the origin and execution labels of its underlying artifact.",
    },
    code: {
      title: "Chart-specification contract",
      language: "text",
      status: "available",
      lines: [
        "validate variable keys, units, origin, and execution mode",
        "select the smallest chart type that answers the question",
        "attach a textual summary and noncolor encoding",
        "lazy-load interaction while preserving an HTML fallback",
      ],
      disclosure:
        "Chart implementations bind to checksummed public-derived, synthetic, model, or illustrative arrays and retain each artifact’s origin and execution labels.",
    },
    reproducibility: [
      "Version chart specifications with their source artifacts",
      "Preserve selected-state parameters in shareable URLs",
      "Test summaries against the same arrays rendered visually",
      "Keep exports paired with units and provenance metadata",
    ],
    limitations: [
      "Interaction cannot repair biased data or an invalid model.",
      "Feature-map distance is not interpreted as a learned latent or biological similarity.",
      "Computed arrays do not make every current visual scientifically valid; labels, linkages, summaries, and data alternatives still require route-level QA.",
    ],
    nextTool: "figurl",
    sourceId: "plotly",
  },
  {
    slug: "nwb",
    name: "Neurodata Without Borders (NWB)",
    category: "data",
    shortDescription:
      "The provenance-rich neurophysiology container at the start of the workflow, exposed through a read-only hierarchy and metadata explorer.",
    purpose:
      "NWB supplies a common structure for neurophysiology data and metadata. The site uses the pinned DANDI 000582@0.251111.2151 asset and its deterministic compact derivative for browser delivery.",
    stage: {
      enters: ["Official public archive record", "NWB file or stream", "License and citation metadata"],
      operation: [
        "Validate schema and required provenance",
        "Inspect groups, tables, time series, and metadata",
        "Select a documented session and variables",
        "Generate a hashed compact derivative without changing source identity claims",
      ],
      exits: ["Validation report", "Selected-variable manifest", "Compact derivative", "Conversion log"],
      scientificValue:
        "A shared schema and rich metadata make recordings easier to validate, reuse, convert, and connect to reproducible analysis tools.",
    },
    concepts: [
      {
        title: "Source versus derivative",
        explanation:
          "The compact browser dataset is identified as a transformation of selected source fields, never as the untouched NWB file.",
      },
      {
        title: "Hierarchy with meaning",
        explanation:
          "Acquisition, processing, units, intervals, electrodes, stimuli, behavior, and attributes have distinct roles in the file.",
      },
      {
        title: "Validation evidence",
        explanation:
          "A pass indicator is shown only with the validator version, timestamp, file identity, and retained report.",
      },
      {
        title: "Read-only public surface",
        explanation:
          "The explorer uses a curated artifact and does not accept arbitrary untrusted NWB uploads.",
      },
    ],
    visual: {
      title: "NWB hierarchy and metadata explorer",
      description:
        "A navigable tree reveals general metadata, acquisition, processing, units, trials, electrodes, stimuli, behavior, and validation evidence.",
      interactions: [
        "Navigate hierarchy nodes by keyboard",
        "Inspect dataset shape, type, unit, and description",
        "Open provenance and transformation records",
        "Compare source fields with the compact derivative manifest",
      ],
      fallback:
        "A nested semantic list and definition table expose the same hierarchy and metadata without client scripting.",
      dataDisclosure:
        "The verified source is a 600-second Long Evans rat MEC LII session under CC BY 4.0 with eight selected units. Its 20 ms position stream is decimated to a 100 ms browser derivative.",
    },
    code: {
      title: "Ingestion and validation contract",
      language: "text",
      status: "available",
      lines: [
        "python scripts/build_artifacts.py --download --inspect",
        "verify DANDI 000582@0.251111.2151 + asset UUID + path + SHA-256",
        "run PyNWB schema validation and record NWB Inspector findings",
        "write the 600 s derivative + synthetic fallback + provenance + report",
      ],
      disclosure:
        "PyNWB 3.1.3 and NumPy generate the descriptive derivative. Pynapple 0.11.3 separately verifies the binned t1c1 count sequence used by the model artifact.",
    },
    reproducibility: [
      "Record archive, permanent identifier, exact file, and access date",
      "Retain fetch, validation, and derivative-generation scripts",
      "Hash source identity and every generated browser artifact",
      "Test the synthetic fallback independently of archive availability",
    ],
    limitations: [
      "The source passed identity, license, checksum, and schema review with recorded NWB Inspector caveats; validation does not erase those caveats.",
      "A single selected session cannot support broad biological generalization.",
      "The public explorer is read-only and will not parse arbitrary uploads.",
    ],
    nextTool: "pynapple",
    sourceId: "nwb",
  },
] as const satisfies readonly ToolRecord[];

export const toolBySlug = Object.fromEntries(
  tools.map((tool) => [tool.slug, tool]),
) as Record<ToolSlug, (typeof tools)[number]>;

export function getTool(slug: ToolSlug): ToolRecord {
  return toolBySlug[slug];
}

export const toolCounts = tools.reduce(
  (counts, tool) => ({
    ...counts,
    [tool.category]: (counts[tool.category] ?? 0) + 1,
  }),
  {} as Partial<Record<ToolRecord["category"], number>>,
);
