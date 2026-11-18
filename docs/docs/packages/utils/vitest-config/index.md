---
title: 'vitest-config'
sidebar_label: 'vitest-config'
description: 'Shared Vitest configuration for Strapi unit tests'
package: 'vitest-config'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides a reusable Vitest configuration for the Strapi monorepo unit tests. Internal tooling only; not published for external use.

## Key concepts

- **Unit test preset**: Exports `unitPreset` from `vitest-config/presets/unit`. Merge it with package-specific `defineConfig()`. See [README](https://github.com/strapi/strapi/blob/develop/packages/utils/vitest-config/README.md).
- **Peer dependency**: Requires `vitest >= 4.0.0` in the consumer's environment.
- **Used by**: Internal packages in the monorepo reference this in their vitest configs.

## Related

- [Testing](../../../contributing/03-testing/index.md): unit test execution.
