---
title: 'create-strapi-app'
sidebar_label: 'create-strapi-app'
description: 'CLI to scaffold a new Strapi project'
package: 'create-strapi-app'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides the official CLI for Strapi app developers to create new Strapi projects. Available via `yarn create strapi-app` or `npx create-strapi-app`. Handles project initialization, prompts for configuration, and can integrate with Strapi Cloud.

## Key concepts

- **Entry point**: `run()` function processes CLI arguments and guides project creation. See [index.ts](https://github.com/strapi/strapi/tree/develop/packages/cli/create-strapi-app).
- **Interactive prompts**: Collects project name, database choice, and optional Cloud integration via `prompts.ts`.
- **Dual mode**: Supports local project creation and Strapi Cloud project creation with API integration.

## Related

- [Testing](../../../contributing/03-testing/index.md): CLI test infrastructure.
