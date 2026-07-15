# Security policy

## Current release status

NeuroStack Explorer is under development and is not approved for production
deployment. No supported production version exists yet.

The selected scientific source is public DANDI data under CC BY 4.0, but public
availability does not relax the repository’s integrity, privacy, or execution
controls. The exact asset is pinned by immutable version, UUID, path, byte size,
and SHA-256; the complete NWB file remains outside Git and the browser bundle.

## Reporting a vulnerability

Do not disclose a suspected vulnerability, leaked credential, private dataset
location, or identifying information in a public issue.

No dedicated security-reporting address or response target is configured. Until
the repository owner publishes one, contact the owner through an already
established private channel and include:

- affected commit or local version;
- affected route, script, artifact, or workflow;
- steps to reproduce with sensitive values removed;
- potential impact;
- suggested mitigation if known.

Do not test against a public deployment or third-party archive in a way that
could affect other users, bypass access controls, or violate terms.

## Threat model

The expected public surface is a mostly static scientific site consuming
versioned artifacts. Principal risks include:

- arbitrary code or notebook execution;
- malicious or oversized uploaded NWB files;
- secrets or signed URLs included in frontend bundles, notebooks, logs, or
  generated metadata;
- compromised or mutated source artifacts;
- dependency and build-chain compromise;
- HTML/script injection through dataset metadata or notebook output;
- resource exhaustion from unbounded client computation;
- share URLs containing private state;
- accidental publication of restricted, clinical, participant, client, or local
  filesystem information;
- misleading provenance that makes synthetic or stale artifacts appear current.

## Required controls

### No arbitrary execution

- Do not execute visitor-supplied Python, shell, Stan, JavaScript, or notebook
  content.
- Do not expose a general-purpose Jupyter server.
- Render notebook previews from sanitized, pre-executed artifacts.
- Treat generated HTML and notebook outputs as untrusted until sanitized.

### No unreviewed uploads

Untrusted NWB upload is out of scope. Adding it requires a separate design for
file-type validation, isolation, size/time/memory limits, malware handling,
metadata sanitization, retention/deletion, abuse controls, and privacy review.

### Artifact integrity

- Pin source identifiers and verify SHA-256 before processing. The current
  source is DANDI `000582@0.251111.2151`, asset UUID
  `2b9e441b-56bc-4be2-893e-0e02d22d239d`, SHA-256
  `43b3b435b953d22e276acc494af2926b63deaf15d2834531b2a87d08a8458a09`.
- Fail closed when bytes or schemas do not match the manifest.
- Record generator commit, environment-lock checksum, command, and output
  checksum.
- Avoid executing code from downloaded dataset archives.

### Secret handling

- Keep credentials in approved local or hosting secret stores.
- Never put secrets in `.env.example`, `NEXT_PUBLIC_*`, notebooks, fixtures,
  screenshots, generated JSON, share URLs, or Git history.
- Use least-privilege, short-lived credentials only if a future source requires
  authenticated access; public-data selection should not require them.
- Review production bundles and artifacts for secret-like values before release.

### Browser and content controls

- Escape or sanitize dataset metadata and notebook-derived content.
- Constrain accepted query/share-state keys, types, and lengths.
- Use safe external-link attributes and a reviewed Content Security Policy where
  the hosting target supports it.
- Avoid remote scripts and third-party embeds unless their integrity, privacy,
  accessibility, and availability tradeoffs are documented.
- Bound browser computations and move heavier safe work into Web Workers.

All current browser outputs must be precomputed artifacts or bounded
client-derived views. The browser must not present filtering, selection,
binning, a specification fixture, or share-state replay as live Python, model
training, Stan sampling, BridgeStan compilation, or plenoptic synthesis.

## Data and privacy

Only the pinned public-derived artifact or visibly labeled deterministic
synthetic fallback belongs in the current scientific application. Do not
collect or publish PHI, patient information, private
participant data, client details, credential identifiers, precise personal
addresses, or private repository/archive URLs.

The current derivative excludes the ambiguous unitless subject-weight string
and does not interpret the placeholder 1900 session time as an acquisition
date. Share URLs must contain bounded view state only and never local cache
paths, source download tokens, or notebook filesystem paths.

If an apparently public dataset contains identifying or restricted fields, stop
processing and escalate the source choice. Public availability alone is not a
privacy or redistribution determination.

## Dependency and workflow review

- Use lockfiles and reviewed package sources.
- Pin GitHub Actions by immutable commit before a production security review;
  version tags in initial scaffolding are not a supply-chain guarantee.
- Keep CI permissions read-only unless a job has a documented need.
- Do not add a deploy workflow until deployment is explicitly approved.
- Review dependency advisories and licenses before each release.
