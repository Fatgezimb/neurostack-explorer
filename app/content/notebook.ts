import type { NotebookArtifact } from "@/lib/contracts";

export const notebookArtifact: NotebookArtifact = {
  id: "neurostack-explorer-notebook",
  title: "NeuroStack Explorer: executable research walkthrough",
  status: "available",
  path: "/artifacts/v1/neurostack-explorer.ipynb",
  kernel: "Python 3.12.13",
  sections: [
    { order: 1, title: "Project overview", purpose: "Define the educational, nonclinical scope and the one-recording analysis question.", expectedOutput: "Scope, research question, and interpretation boundary" },
    { order: 2, title: "Environment information", purpose: "Record the executing Python runtime and exact installed scientific package versions.", expectedOutput: "Python, platform, and twelve package versions" },
    { order: 3, title: "Dataset provenance", purpose: "Verify DANDI 000582@0.251111.2151, the asset UUID, source checksum, license, derivative hash, and synthetic separation.", expectedOutput: "Immutable source identity and CC BY 4.0 attribution" },
    { order: 4, title: "NWB loading", purpose: "Open the exact cached NWB with PyNWB only after byte-size and checksum verification.", expectedOutput: "NWB identifier, format version, selected units, and source sample count" },
    { order: 5, title: "Data validation", purpose: "Check schema status, monotonic timestamps, finite coordinates, unit IDs, time support, and spike counts.", expectedOutput: "Zero PyNWB schema errors and reviewed invariant results" },
    { order: 6, title: "Pynapple conversion", purpose: "Construct explicit IntervalSet, TsdFrame, and TsGroup objects and independently verify 100 ms t1c1 counts.", expectedOutput: "Pynapple object shapes, support, group size, and count-vector equality" },
    { order: 7, title: "Exploratory analysis", purpose: "Recompute descriptive firing-rate and occupancy summaries without causal or population claims.", expectedOutput: "Transparent rate, occupancy, and interpretation checks" },
    { order: 8, title: "NeMoS model", purpose: "Refit the frozen Poisson GLM and verify coefficients and held-out deviance against the committed artifact.", expectedOutput: "Deterministic NeMoS refit and Pynapple input-count verification" },
    { order: 9, title: "scikit-learn comparison", purpose: "Refit the aligned Poisson baseline and inspect its leakage boundary, validation audit, and final-test result.", expectedOutput: "Deterministic scikit-learn coefficients and aligned evaluation" },
    { order: 10, title: "PyTorch model", purpose: "Retrain the selected deterministic CPU architecture and inspect the declared architecture comparison and early-stopping rule.", expectedOutput: "Reproduced configuration, checkpoint selection, and held-out deviance" },
    { order: 11, title: "Stan uncertainty example", purpose: "Inspect actual Stan source, posterior summaries, diagnostics, and the deterministic posterior-predictive check.", expectedOutput: "Source hash, R-hat, effective sample size, credible intervals, and predictive audit" },
    { order: 12, title: "Plotly visualization", purpose: "Render the committed occupancy-aware tuning arrays as a real Plotly MIME output with units and legend labels.", expectedOutput: "Interactive tuning-rate and occupancy figure plus text summary" },
    { order: 13, title: "Results", purpose: "Report every aligned model lane on the same final-test target, split, and metric without declaring a universal winner.", expectedOutput: "Four-lane validation and final-test table" },
    { order: 14, title: "Limitations", purpose: "State dataset, behavioral-variable, causal, model, split, derivative, and interface-demo limitations.", expectedOutput: "Evidence-limited conclusions" },
    { order: 15, title: "Reproduction instructions", purpose: "List the checksum-gated acquisition, build, modeling, notebook, and full verification commands.", expectedOutput: "Clean-clone command sequence and lock/artifact hashes" },
  ],
  reproductionSteps: [
    "Create the declared Python 3.12 environment from requirements.lock.",
    "Fetch the exact DANDI asset through the explicit checksum-gated data target.",
    "Run scripts/validate_nwb.py --inspect and scripts/build_artifacts.py --inspect.",
    "Run scripts/run_models.py and the BridgeStan and plenoptic generators.",
    "Run scripts/create_notebook.py and scripts/execute_notebook.py from a clean kernel.",
    "Run make verify and compare every generated artifact against its manifest hash.",
  ],
  disclosure:
    "The downloadable .ipynb is an executed 15-section notebook. It loads and validates the exact cached NWB source, builds Pynapple objects, refits the deterministic NeMoS, scikit-learn, and PyTorch lanes, inspects the actual Stan posterior artifact, and renders a Plotly output. Stan sampling, BridgeStan surface generation, and plenoptic synthesis remain offline precomputation steps documented by their own generators. The notebook manifest publishes its exact SHA-256 and execution status; no public kernel is exposed.",
};
