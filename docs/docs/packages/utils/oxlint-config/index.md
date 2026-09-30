---
title: 'oxlint-config'
sidebar_label: 'oxlint-config'
description: 'Shared Oxlint configuration for the Strapi monorepo'
package: 'oxlint-config'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides the Oxlint configuration for the entire Strapi monorepo. Oxlint runs once over all code; this config composes back-end, front-end, and test overrides into a single policy instead of per-package files.

## Key concepts

- **Composed config**: Exports base, back-end, front-end, and test-specific configs as a single object with overrides. See [oxlint.config.ts](https://github.com/strapi/strapi/tree/develop/packages/utils/oxlint-config).
- **Area-specific rules**: Back-end, front-end (React 18), and test overrides differ in linting rules and environments. Avoids per-package duplication.
- **ESM module**: Declared as `"type": "module"` to load via `oxlint --config` without MODULE_TYPELESS_PACKAGE_JSON warnings.

## Related
