# Admin translation verification

Validates Strapi admin `react-intl` message descriptors against `en.json` and locale files.

## Commands

```bash
# Full validation (exit 1 on errors)
yarn verify:translations

# Backfill missing en.json keys from defaultMessage, then reorder/prune locale orphans
yarn verify:translations --fix

# Scope to one package
yarn verify:translations --bundle=core/content-manager
```

`--fix` always closes `en.json` gaps **before** pruning locales. A key used in code with a
`defaultMessage` but missing from `en.json` is added first; only then are locale keys absent
from that catalog removed. That keeps translator work for live message ids.

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

- **finite-enum** — template literals like ``getTrad(`attribute.${type}`)``; expanded by matching the template pattern against `en.json` keys
- **schema-driven** — `content-manager.content-types.${uid}.${field}` etc.; require `defaultMessage`, not `en.json`
- **error-passthrough** — `formatMessage({ id: error })` from Yup; keys collected from schema literals

Admin message namespaces (`global.`, `Settings.`, …) are derived from `core/admin` `en.json` — not a hand-maintained prefix list. Plugin message prefixes are derived from the package path (`plugins/i18n` → `i18n`; `core/admin` has none).

## Legacy scripts

- `reorder-admin-translation-files.js` — replaced by `yarn verify:translations --fix`
- `add-missing-keys-to-other-language.js` — kept for explicit translator workflows

## Follow-ups

- Optional: overwrite/sync existing `en.json` values from `defaultMessage` and align call sites (`--write-en`)
- Optional: promote remaining `default-message-drift` warnings to errors once catalogs are aligned
