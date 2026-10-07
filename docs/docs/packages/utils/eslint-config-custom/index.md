---
title: 'eslint-config-custom'
sidebar_label: 'eslint-config-custom'
description: 'ESLint configuration for Strapi packages'
package: 'eslint-config-custom'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides custom ESLint configurations for the Strapi monorepo packages. Extends `@strapi/eslint-config` with rules and overrides specific to the project, separating back-end and front-end configurations.

## Key concepts

- **Separate configurations**: Dedicated configs for back-end (JavaScript) and front-end (TypeScript/React). See [back/](https://github.com/strapi/strapi/tree/develop/packages/utils/eslint-config-custom) and `front/`.
- **Extends Strapi's base**: Builds on `@strapi/eslint-config` with monorepo-specific rules: disabled Prettier plugin, relaxed dynamic require rules, and test file exceptions for imports.
- **Consumed by**: Core packages, plugins, and providers use this in their ESLint configs, including `@strapi/database`, `@strapi/core`, `@strapi/permissions`.

## Related
