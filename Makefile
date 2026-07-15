SHELL := /bin/bash
.DEFAULT_GOAL := help

NPM ?= npm
NODE ?= node
NPX ?= npx
PYTHON ?= python3
PYTHON_LOCK ?= requirements.lock
NOTEBOOK ?= notebooks/neurostack_explorer.ipynb

.PHONY: help install install-web install-python schemas lint-web typecheck-web \
	test-web build-web verify-web lint-python typecheck-python test-python \
	verify-python notebook verify-notebook verify-artifact-hashes \
	verify-heavy-fixtures verify-scientific validate-nwb fetch-data build-data \
	artifact-policy verify clean-generated

help: ## Show the documented command surface.
	@awk 'BEGIN {FS = ":.*## "; printf "NeuroStack Explorer targets\n\n"} /^[a-zA-Z0-9_.-]+:.*## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: install-web ## Install reviewed web dependencies.

install-web: ## Install the web application from package-lock.json.
	$(NPM) ci

install-python: ## Install the reviewed Python environment lock.
	@if [[ ! -f "$(PYTHON_LOCK)" ]]; then \
		echo "Missing $(PYTHON_LOCK). Exact Python versions remain pending source and compatibility audit." >&2; \
		exit 1; \
	fi
	$(PYTHON) -m pip install -r "$(PYTHON_LOCK)"

schemas: ## Check schema JSON syntax and contract declarations.
	$(NODE) schemas/validate-schemas.mjs

lint-web: ## Run the configured frontend linter.
	$(NPM) run lint

typecheck-web: ## Run TypeScript without emitting build files.
	$(NPX) tsc --noEmit --incremental false

test-web: ## Run configured rendered-output tests; the current script also builds.
	$(NPM) test

build-web: ## Build the production web application without deploying.
	$(NPM) run build

verify-web: schemas lint-web typecheck-web test-web ## Run schema and web checks.

lint-python: ## Check Python source formatting and Ruff rules.
	@if [[ ! -f "$(PYTHON_LOCK)" ]]; then \
		echo "Cannot lint Python: missing $(PYTHON_LOCK)." >&2; \
		exit 1; \
	fi
	$(PYTHON) -m ruff check python scripts tests/python .github/workflows/scripts/check-scientific-integrity.py
	$(PYTHON) -m ruff format --check python scripts tests/python .github/workflows/scripts/check-scientific-integrity.py

typecheck-python: ## Type-check the Python package and generation scripts.
	$(PYTHON) -m mypy python scripts .github/workflows/scripts/check-scientific-integrity.py

test-python: ## Run the Python artifact and method contract tests.
	$(PYTHON) -m pytest

verify-python: lint-python typecheck-python test-python ## Run all static and unit Python checks.
	$(PYTHON) -m pip check

verify-artifact-hashes: ## Verify committed manifests, checksums, copies, and sanitization.
	$(PYTHON) .github/workflows/scripts/check-scientific-integrity.py

verify-scientific: verify-artifact-hashes ## Run scientific validators normally and with assertions disabled.
	@if [[ ! -f scripts/validate_artifacts.py ]]; then \
		echo "Cannot verify scientific artifacts: scripts/validate_artifacts.py is not implemented." >&2; \
		exit 1; \
	fi
	$(PYTHON) scripts/validate_artifacts.py
	$(PYTHON) -O scripts/validate_artifacts.py

validate-nwb: ## Validate the cached pinned NWB source with PyNWB and reviewed invariants.
	$(PYTHON) scripts/validate_nwb.py

fetch-data: ## Fetch the pinned public asset after explicit provenance approval.
	@if [[ "$(NEUROSTACK_DATASET_STATUS)" != "verified" || "$(NEUROSTACK_ALLOW_PUBLIC_DATA_FETCH)" != "true" ]]; then \
		echo "Public-data fetch is gated. Set verified provenance and explicitly allow the fetch." >&2; \
		exit 1; \
	fi
	@if [[ ! -f scripts/fetch_public_dataset.py ]]; then \
		echo "Missing scripts/fetch_public_dataset.py." >&2; \
		exit 1; \
	fi
	$(PYTHON) scripts/fetch_public_dataset.py

build-data: ## Build deterministic derivatives from an already verified source.
	@if [[ ! -f scripts/build_demo_dataset.py ]]; then \
		echo "Missing scripts/build_demo_dataset.py." >&2; \
		exit 1; \
	fi
	$(PYTHON) scripts/build_demo_dataset.py

notebook: ## Recreate and execute the deterministic notebook source.
	$(PYTHON) scripts/create_notebook.py
	$(PYTHON) scripts/execute_notebook.py

verify-notebook: ## Re-execute the notebook and match its reviewed release checksum.
	@expected="$$( $(PYTHON) -c 'import json; print(json.load(open("public/artifacts/v1/notebook-manifest.json"))["sha256"])' )"; \
	$(MAKE) --no-print-directory notebook PYTHON="$(PYTHON)"; \
	actual="$$( $(PYTHON) -c 'import hashlib; print(hashlib.sha256(open("$(NOTEBOOK)", "rb").read()).hexdigest())' )"; \
	if [[ "$$actual" != "$$expected" ]]; then \
		echo "Notebook checksum drifted: expected $$expected, found $$actual." >&2; \
		exit 1; \
	fi
	cmp "$(NOTEBOOK)" public/artifacts/v1/neurostack-explorer.ipynb
	cmp "$(NOTEBOOK)" public/downloads/neurostack_explorer.ipynb
	$(PYTHON) .github/workflows/scripts/check-scientific-integrity.py

verify-heavy-fixtures: ## Regenerate the offline plenoptic fixture and confirm byte stability.
	$(PYTHON) scripts/generate_plenoptic_demo.py
	$(PYTHON) .github/workflows/scripts/check-scientific-integrity.py

artifact-policy: ## Reject oversized, secret-like, or undocumented tracked data files.
	$(NODE) .github/workflows/scripts/check-artifact-policy.mjs

verify: verify-web verify-python verify-notebook verify-heavy-fixtures verify-scientific artifact-policy ## Run all offline release checks without deploying.

clean-generated: ## Remove local build output, never source data.
	rm -rf .next .vinext dist outputs
