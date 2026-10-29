# Admin translation verification

Validates Strapi admin `react-intl` message descriptors against `en.json` and locale files.

## Commands

```bash
# Full validation (exit 1 on errors)
yarn verify:translations

# Deterministic gap report: keys in en.json missing from some locales,
# with sibling-locale values + code call sites (JSON to stdout or --out=)
yarn verify:translations --report-gaps
yarn verify:translations --report-gaps --locale=fr,de --out=gaps.json
yarn verify:translations --report-gaps --bundle=core/upload

# Sync en.json gaps from defaultMessage, then align call-site defaults to en.json
# (existing catalog English is preserved; use --sync-existing to overwrite from code)
yarn verify:translations --write-en

# Overwrite existing en.json values from defaultMessage (code → catalog)
yarn verify:translations --write-en --sync-existing

# Backfill any remaining en.json gaps, then reorder/prune locale orphans
yarn verify:translations --fix

# Scope to one package
yarn verify:translations --bundle=core/content-manager
```

`--fix` always closes `en.json` gaps **before** pruning locales. A key used in code with a
`defaultMessage` but missing from `en.json` is added first; only then are locale keys absent
from that catalog removed. That keeps translator work for live message ids.

## Gap report (`--report-gaps`)

Purely deterministic — no model calls. For each `en.json` key missing from one or more locale
files, the JSON includes:

- `en` — English catalog value
- `missingLocales` — locale codes that lack the key (`--locale=` filters this list)
- `presentLocales` — existing translations in other locales (context for fill/review)
- `usages` — static call sites (`file`, `line`, `defaultMessage`) when extractable

Use this as the input contract for later AI fill / AI review of community translation PRs.

## What it checks

| Check                                                                            | Severity |
| -------------------------------------------------------------------------------- | -------- |
| Static / finite-enum keys used in code exist in the correct `en.json`            | error    |
| Cross-package `core/admin` keys referenced from plugins                          | error    |
| Locale keys exist in `en.json` and follow its relative order                     | error    |
| `defaultMessage` matches `en.json` (whitespace-normalized)                       | error    |
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
- `add-missing-keys-to-other-language.js` — kept for explicit translator workflows (copies English; prefer `--report-gaps` + AI fill later)

## Notes

- `--write-en` fills gaps and, by default, **preserves existing `en.json`** values; pass `--sync-existing` to overwrite catalogs from code.
- After `--write-en`, minority call-site `defaultMessage`s are aligned to the catalog.
- CI runs `yarn verify:translations` (no write flags).

<!-- CI retrigger marker -->
