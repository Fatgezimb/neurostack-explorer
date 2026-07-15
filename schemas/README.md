# Scientific artifact schemas

These JSON Schema Draft 2020-12 contracts define the boundary between offline
scientific generation and the public TypeScript application.

| Schema | Purpose |
| --- | --- |
| `dataset-provenance.schema.json` | Public source, license, selected asset, derivative, and privacy record |
| `analysis-artifact.schema.json` | Generated dataset, figure, table, notebook, model, posterior, or visualization artifact |
| `model-result.schema.json` | Task, split, leakage, metric, configuration, and evaluated-model record |
| `tool-version.schema.json` | Audited software version, source, license, and dependent-artifact ledger |
| `notebook-manifest.schema.json` | Notebook input, execution, sanitization, and output record |
| `scientific-artifact-bundle.schema.json` | Runtime contract for every generated dataset, model bundle, interface demo, release manifest, and validation report shipped by the site |

Schema identifiers use `urn:neurostack-explorer:*` because no permanent public
schema URL has been approved. A future change to hosted schema identifiers is a
versioned contract change.

## Versioning

- `schemaVersion` is a semantic schema contract version, initially `1.0.0`.
- Additive optional fields may use a minor version.
- Changed required fields, meanings, units, or enum values require a major
  version and migration plan.
- Generated artifacts must name the schema version they conform to.
- Never silently reinterpret an old artifact with a new schema.

## Pending records

Schemas deliberately permit explicit `pending` or `planned` records with null
evidence fields. They conditionally require stronger evidence for `verified`,
`generated`, `validated`, or `evaluated` states. Do not use realistic filler
values to bypass those gates.

## Validation

Run:

```bash
node schemas/validate-schemas.mjs
```

The Node script checks schema syntax, declarations, identifiers, and references.
`scripts/validate_artifacts.py` then uses a standards-compliant Draft 2020-12
validator to check every shipped JSON instance against its assigned runtime
schema. Both checks run in the documented release verification path.
