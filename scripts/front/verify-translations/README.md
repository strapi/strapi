# Admin translation verification

Validates Strapi admin `react-intl` message descriptors against `en.json` and locale files.

## Commands

```bash
# Full validation (exit 1 on errors)
yarn verify:translations

# Reorder existing locale keys and prune keys absent from en.json
yarn verify:translations --fix

# Regenerate types for bundles with typed consumers (currently content-manager)
yarn verify:translations --write-types

# Scope to one package
yarn verify:translations --bundle=core/content-manager
```

## What it checks

| Check                                                                            | Severity |
| -------------------------------------------------------------------------------- | -------- |
| Static / finite-enum keys used in code exist in the correct `en.json`            | error    |
| Cross-package `core/admin` keys referenced from plugins                          | error    |
| Locale keys exist in `en.json` and follow its relative order                     | error    |
| `defaultMessage` matches `en.json` (whitespace-normalized)                       | warning  |
| Yup/schema `error.*` / `validation.*` string literals exist in package `en.json` | error    |
| `notification.*` validation strings exist in `core/admin` `en.json`              | error    |

## Dynamic keys

Extractions are classified automatically:

- **finite-enum** — template literals like ``getTrad(`attribute.${type}`)``; expanded from `en.json` prefixes
- **schema-driven** — `content-manager.content-types.${uid}.${field}` etc.; require `defaultMessage`, not `en.json`
- **error-passthrough** — `formatMessage({ id: error })` from Yup; keys collected from schema literals
- **registry** — small set of documented patterns (bulk locale titles, etc.)

Plugin authors are unaffected: typed helpers retain a `string` fallback, so custom plugin keys
still typecheck.

## Legacy scripts

- `reorder-admin-translation-files.js` — replaced by `yarn verify:translations --fix`
- `add-missing-keys-to-other-language.js` — kept for explicit translator workflows

## Follow-ups

- Locale hygiene (`yarn verify:translations --fix`) and burn-down of remaining validation debt
- CI gate (`yarn verify:translations` in `.github/workflows/tests.yml`) once debt is burned down
- Optional: generate `en.json` from `defaultMessage` in source (Alternative A)
