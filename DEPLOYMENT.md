# Deployment and release gates

## Authorization status

**Deployment is not authorized.**

Do not create a production release, publish a preview containing unverified
claims, change a hosting access policy, connect a custom domain, or reuse the
main portfolio's hosting project identifier without explicit owner approval.

This runbook documents readiness checks only.

## Verified release inputs already recorded

- DANDI `000582`, immutable version `0.251111.2151`, CC BY 4.0;
- exact NWB asset path, UUID, 15,657,857-byte size, and SHA-256;
- 600-second Long Evans rat MEC LII selection, source position interval of
  20 ms, 100 ms derivative grid, and eight reviewed unit IDs;
- checksummed public-derived and deterministic synthetic artifacts;
- checksummed NeMoS, scikit-learn, PyTorch, and Stan outputs for task
  `next-bin-count-v2` and its frozen split;
- computed, checksummed BridgeStan and plenoptic illustrative artifacts;
- an executed read-only verification notebook;
- reviewed tool-version and license ledger;
- MIT project-code license.

The scientific artifact validator reports `share-with-caveats` with no blockers.
Clean-room install verification, frontend/accessibility QA, operational
ownership, public URL review, a release commit, and explicit deployment
approval remain open.

## Expected deployment shape

The preferred initial release is a static or server-rendered web application
that reads versioned, precomputed scientific artifacts. It should not require a
public Python service, database, authentication, paid API, or arbitrary notebook
execution.

The exact hosting provider, public URL, build adapter, and cache strategy remain
subject to deployment audit and approval. Artifact origins are already recorded
as public-derived, synthetic, or illustrative, with execution kept separately
as precomputed or bounded client-derived. Starter hosting configuration does
not establish an approved target.

## Release inputs

A release must pin:

- Git commit and clean working-tree state;
- Node and Python versions and lockfile checksums;
- dataset identifier, license, exact source asset, access date, and checksum;
- derivative, aligned model, BridgeStan, plenoptic, notebook, provenance,
  validation, manifest, and web-build checksums;
- schema versions;
- environment variable names and visibility classifications;
- public route inventory and canonical URL;
- current citations and limitations.

## Pre-release gates

### Scientific evidence

- [x] primary public dataset and exact asset are verified;
- [x] source and derivative licenses are recorded as CC BY 4.0;
- [x] source and current generated checksums match manifests;
- [x] synthetic fallback is deterministic and visibly labeled;
- [x] model task, feature timing, split, leakage boundary, metrics, sampler
      diagnostics, and limitations are recorded and validate;
- [x] notebook executes without errors in Python 3.12.13 and is sanitized;
- [x] every current public or synthetic artifact has an origin, execution state,
      checksum, and provenance link;
- [x] reviewed software versions, licenses, and source links are recorded.

### Engineering

- [ ] clean install succeeds from Node and Python locks;
- [ ] schemas and all manifest instances validate;
- [ ] lint, TypeScript, Python formatting/typing, unit tests, pipeline tests,
      notebook execution, rendered-route tests, and production build pass;
- [ ] no console, hydration, or broken-link errors remain;
- [x] dataset, model, BridgeStan, and plenoptic artifacts regenerate
      deterministically within their recorded checks and hashes;
- [ ] no source asset is unintentionally bundled into every route;
- [ ] initial JavaScript and artifact sizes meet reviewed budgets.

### Accessibility and responsive quality

- [ ] [ACCESSIBILITY.md](./ACCESSIBILITY.md) verification matrix is complete;
- [ ] every scientific chart has a summary, units, and data alternative;
- [ ] keyboard, touch, reduced motion, high zoom, and no-JavaScript states pass;
- [ ] representative 320–1440+ CSS-pixel layouts are reviewed.

### Security, privacy, and legal

- [ ] no credentials, signed URLs, private paths, PHI, identifying participant
      data, or restricted assets appear in Git, bundles, logs, notebooks, or
      generated files;
- [ ] dependency and GitHub Actions review is current;
- [ ] external scripts, embeds, and links are reviewed;
- [x] project code license is MIT with copyright 2026 Fatgezim Bela;
- [x] third-party software and data licenses are recorded; the plenoptic input
      is project-generated procedural imagery with no external image license;
- [ ] public disclaimer and limitation language is present.

### Product and operations

- [ ] all required routes contain substantive content;
- [ ] every action and share link works on desktop and mobile;
- [ ] canonical URL, metadata, social image, sitemap, and robots behavior are
      reviewed for the approved access policy;
- [ ] artifact caching and invalidation are documented;
- [ ] monitoring, failure fallback, and rollback owner are identified;
- [ ] screenshots and final implementation report are complete;
- [ ] explicit owner deployment approval is recorded.

## Environment policy

Public environment variables are configuration, not secret storage. Any
`NEXT_PUBLIC_*` value is assumed readable by visitors. Secrets, if a future
architecture genuinely needs them, belong in the hosting provider's encrypted
secret store with least privilege and rotation documentation.

Production must default to the verified release manifest. It must not silently
switch from missing public artifacts to synthetic data without a visible status
change.

## Release sequence after approval

1. Freeze the exact reviewed commit and manifests.
2. Re-run clean-room generation and the complete verification suite.
3. Build the production application from that exact commit.
4. Publish to a non-public or access-restricted preview if the approved provider
   supports it.
5. Smoke-test routes, artifact states, links, accessibility controls, caching,
   and failure fallbacks.
6. Obtain final owner confirmation for public access.
7. Promote the identical artifact; do not rebuild with unrecorded dependencies.
8. Verify the public URL without privileged cookies.
9. Record deployment identifier, timestamp, commit, manifest, and smoke results.

## Rollback

Retain the previous known-good immutable web and scientific artifact releases.
Rollback should switch both together so that the site does not load model
results against an incompatible schema or dataset derivative. Document the
reason, affected release, and any source/archive change that triggered rollback.

## CI boundary

Workflows under `.github/workflows/` perform verification only. They must not
publish artifacts to a public service or deploy the application unless a later,
explicitly approved change adds a reviewed release workflow.
