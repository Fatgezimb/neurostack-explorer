# Installation and local development

## Supported environments

- Node.js `>=24.0.0` with the committed npm lockfile;
- Python `>=3.12,<3.13` with `requirements.lock`;
- CmdStan 2.39.0 and the BridgeStan C++ source/toolchain when regenerating
  compiled Stan artifacts.

The recorded release environment is Python 3.12.13 on macOS arm64. The Python
lock pins the complete notebook, NWB, Pynapple, NeMoS/JAX, scikit-learn,
PyTorch, CmdStanPy, BridgeStan Python, plenoptic, Plotly, test, lint, and typing
lane. CmdStan itself and BridgeStan’s compiled C++ components are external to
the wheel lock.

## Web application

```bash
npm ci
npm run dev
```

Open `http://localhost:3000` unless the server reports another address.

Web verification:

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` runs unit tests, a production build, and rendered-HTML tests. Run a
separate `npm run build` only when another explicit build is useful, and report
the duplicate build accurately.

## Python environment

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.lock
python -m pip check
```

`make install-python` installs the same lock through the Makefile.

If CmdStan 2.39.0 is absent, the model runner can install it explicitly:

```bash
python scripts/run_models.py --install-cmdstan
```

That download and compilation can be large and slow. A normal run without the
flag fails rather than silently changing the toolchain.

## Pinned public dataset

The pipeline accepts only:

- Dandiset `000582`, version `0.251111.2151`;
- `sub-10073/sub-10073_ses-17010302_behavior+ecephys.nwb`;
- asset UUID `2b9e441b-56bc-4be2-893e-0e02d22d239d`;
- 15,657,857 bytes;
- SHA-256
  `43b3b435b953d22e276acc494af2926b63deaf15d2834531b2a87d08a8458a09`;
- CC BY 4.0.

The default cache is
`~/.cache/neurostack-explorer/dandi/000582/0.251111.2151/`. The builder fails
closed if size or checksum differs.

Use an existing cache:

```bash
python scripts/build_artifacts.py --inspect
```

Permit the reviewed 15.7 MB download when absent:

```bash
python scripts/build_artifacts.py --download --inspect
```

Verify an explicit local copy:

```bash
python scripts/build_artifacts.py --source /absolute/path/to/source.nwb --inspect
```

Never commit the source NWB to ordinary Git history.

## Full deterministic artifact sequence

Run the stages in this order from the activated Python 3.12 environment:

```bash
python scripts/build_artifacts.py --inspect
python scripts/run_models.py
python scripts/generate_bridgestan_demo.py
python scripts/generate_plenoptic_demo.py
python scripts/create_notebook.py
python scripts/execute_notebook.py
python scripts/build_artifacts.py --inspect
python scripts/validate_artifacts.py
```

The first build creates the descriptive public derivative and synthetic
fallback used by the model runner. The model, BridgeStan, and plenoptic scripts
then create their distinct outputs. The notebook is recreated and executed.
The final build refreshes provenance, validation, manifest, notebook manifest,
and the public notebook copy so every recorded hash matches the final bytes.

The BridgeStan and plenoptic scripts have no argument parser; invoking them
executes regeneration immediately.

## Notebook download and scope

The source notebook is `notebooks/neurostack_explorer.ipynb`. The final build
copies the same bytes to
`public/artifacts/v1/neurostack-explorer.ipynb`; this repository also exposes
the exact copy at `public/downloads/neurostack_explorer.ipynb` for the current
site link.

`scripts/execute_notebook.py` executes from a clean kernel, fails on a cell
error, and strips wall-clock execution metadata. It verifies the committed
public-derived and synthetic JSON, including embedded model records. It does
load the separate BridgeStan and plenoptic artifacts. It refits the three Python
model lanes and asserts their recorded metrics/configurations; Stan remains a
reviewed precomputed artifact.

## Python verification

```bash
make lint-python PYTHON=python
make typecheck-python PYTHON=python
make test-python PYTHON=python
make verify-notebook PYTHON=python
make verify-heavy-fixtures PYTHON=python
make verify-scientific PYTHON=python
```

These targets run Ruff lint and formatting checks, mypy, pytest, a clean
notebook recreation/execution with exact scientific-output comparison, immutable
release-file checksum and sanitization checks, deterministic
plenoptic regeneration, manifest integrity checks, and the artifact validator
both normally and with `python -O`. The optimized run confirms that validation
does not depend on disabled `assert` statements. `make verify-python` also runs
`python -m pip check`.

Scientific CI fetches or reuses the checksum-verified pinned public NWB source
for notebook execution. A fresh in-memory execution must match every reviewed
cell source, output and package version. Only the explicit OS-label line and
wall-clock execution metadata may vary across runners. Verification does not
rewrite the three immutable notebook copies, whose exact SHA-256 records remain
checked separately. CI does not install compiled CmdStan/BridgeStan toolchains;
it verifies their committed source links, diagnostics, bytes and SHA-256 records.
Full Stan/BridgeStan regeneration remains the clean-room sequence above.

Run every offline release gate, including the web build, with:

```bash
make verify PYTHON=python
```

Release CI reads the exact `3.12.13` patch version from `.python-version` and
fails if the runner does not match it.

## Environment configuration

Copy `.env.example` only when a local override is needed:

```bash
cp .env.example .env.local
```

Every `NEXT_PUBLIC_*` value is visible to visitors. Never place secrets,
signed URLs, private bucket names, or unpublished tokens there.

## Clean-room release check

Before claiming release reproducibility:

1. start from a fresh checkout;
2. install Node and Python dependencies from locks;
3. establish the pinned CmdStan/BridgeStan compiled toolchains;
4. verify the exact source asset;
5. run the full artifact sequence above;
6. compare hashes or documented numerical tolerances;
7. run schemas, Python checks, web lint, typecheck, tests, and production build;
8. run accessibility, privacy, license, responsive, and browser gates; and
9. attach the reviewed Git commit and approved deployment record.

A successful local build is not deployment authorization.
