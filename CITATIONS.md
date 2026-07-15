# Citations and source ledger

## Status

Dataset identity, exact software versions, licenses, and execution roles were
recorded on 2026-07-14. A dependency’s presence is not by itself a scientific
result; the checksummed artifacts identify which lanes actually executed.

This ledger does not invent a project DOI, peer review, or affiliation.

## Primary dataset

| Field | Value |
| --- | --- |
| Title | Conjunctive Representation of Position, Direction, and Velocity in Entorhinal Cortex |
| Authors | Francesca Sargolini; Marianne Fyhn; Torkel Hafting; Bruce L. McNaughton; Menno P. Witter; May-Britt Moser; Edvard I. Moser; Haagen Waade; Simon Ball |
| Repository | [DANDI Archive](https://dandiarchive.org/dandiset/000582/0.251111.2151) |
| Dandiset / version | `000582` / `0.251111.2151` |
| Permanent identifier | <https://doi.org/10.48324/dandi.000582/0.251111.2151> |
| License | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Exact asset | `sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb` |
| Asset UUID | `2b9e441b-56bc-4be2-893e-0e02d22d239d` |
| Asset SHA-256 | `43b3b435b953d22e276acc494af2926b63deaf15d2834531b2a87d08a8458a09` |
| Access date | 2026-07-14 |
| Source paper | <https://doi.org/10.1126/science.1125572> |

Public derivatives must retain DANDI attribution and CC BY 4.0. See
[DATA_PROVENANCE.md](./DATA_PROVENANCE.md) for transformations and source
caveats.

## Scientific software ledger

| Tool | First-party source | Executed version | License | Recorded project use |
| --- | --- | --- | --- | --- |
| Python | [3.12 documentation](https://docs.python.org/3.12/) | 3.12.13 | Python Software Foundation License 2.0 | Offline orchestration and notebook execution; no visitor code execution |
| Jupyter ecosystem | [Jupyter documentation](https://docs.jupyter.org/) | nbclient 0.10.2 / nbformat 5.10.4 / ipykernel 6.30.1 / IPython 9.15.0 | BSD licenses | Executed read-only notebook; no public kernel |
| PyNWB | [PyNWB documentation](https://pynwb.readthedocs.io/) | 3.1.3 | BSD-3-Clause | NWB loading and schema validation |
| NWB Inspector | [source](https://github.com/NeurodataWithoutBorders/nwbinspector) | 0.7.2 | BSD-3-Clause | DANDI-profile source inspection with retained findings |
| Pynapple | [0.11.3 source](https://github.com/pynapple-org/pynapple/tree/v0.11.3) | 0.11.3 | MIT | Executed verification of the 100 ms `t1c1` count sequence |
| NeMoS | [0.2.9 source](https://github.com/flatironinstitute/nemos/tree/0.2.9) | 0.2.9 | MIT | Executed Poisson Ridge GLM |
| JAX | [documentation](https://docs.jax.dev/) | 0.10.1 | Apache-2.0 | NeMoS numerical backend with float64 enabled |
| scikit-learn | [PoissonRegressor documentation](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.PoissonRegressor.html) | 1.9.0 | BSD-3-Clause | Executed aligned Poisson baseline |
| PyTorch | [reproducibility documentation](https://docs.pytorch.org/docs/stable/notes/randomness.html) | 2.12.1 | BSD-style | Executed deterministic CPU float64 MLP and plenoptic backend; no GPU claim |
| Stan + CmdStanPy | [Stan](https://mc-stan.org/) | CmdStanPy 1.3.0 / CmdStan 2.39.0 | BSD-3-Clause | Executed aligned Poisson-log posterior-summary lane |
| BridgeStan | [2.9.0 documentation](https://roualdes.us/bridgestan/latest/) | 2.9.0 | BSD-3-Clause | Executed compiled illustrative surface and gradient check |
| plenoptic | [2.0.1 source](https://github.com/plenoptic-org/plenoptic/tree/2.0.1) | 2.0.1 | MIT | Executed procedural-image Metamer synthesis |
| Plotly Python | [documentation](https://plotly.com/python/) | 6.8.0 | MIT | Locked analysis/visualization dependency |
| Plotly JavaScript | [React guidance](https://plotly.com/javascript/react/) | plotly.js-dist-min 3.7.0 | MIT | Browser rendering layer |
| Figurl | [source](https://github.com/flatironinstitute/figurl) | 0.3.1 reviewed package | Apache-2.0 | Reference only; the project ships an internal Figurl-inspired viewer, not official hosting |

The selected source file reports NWB version 2.6.0. That file metadata is
distinct from the current PyNWB validation runtime.

The BridgeStan Python package, CmdStanPy, and their versions are pinned in the
Python environment, while CmdStan 2.39.0 and BridgeStan’s compiled C++ source
tree remain external toolchains recorded by the generators.

## Web framework ledger

| Tool | Source | Repository version | License |
| --- | --- | --- | --- |
| Next.js | <https://nextjs.org/docs> | 16.2.10 | MIT |
| React | <https://react.dev/> | 19.2.6 | MIT |
| TypeScript | <https://www.typescriptlang.org/docs/> | 5.9.3 | Apache-2.0 |
| Vinext | <https://github.com/cloudflare/vinext> | 0.0.50 | Apache-2.0 |

The Node lockfile remains authoritative for the full frontend dependency graph.

## Project citation

Until a reviewed repository release or archival DOI exists, cite the project
without inventing an identifier:

> Bela, Fatgezim “Zim.” *NeuroStack Explorer*. Educational scientific software
> demonstration, 2026. Project code licensed MIT.

A future release citation should add the exact repository URL, commit or tag,
archive DOI if genuinely minted, and access date.

## License boundaries

- Project code and project-authored documentation: MIT, copyright 2026
  Fatgezim Bela.
- DANDI source and public-derived artifacts: CC BY 4.0 with attribution.
- Synthetic fallback: project-generated, nonbiological data.
- plenoptic input: deterministic procedural image generated by this repository;
  no external image license applies.
- BridgeStan fixture: project-generated illustrative output.
- Third-party software retains the licenses above; the project MIT license does
  not relicense dependencies.
