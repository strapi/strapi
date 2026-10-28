---
title: 'tsconfig'
sidebar_label: 'tsconfig'
description: 'Shared TypeScript configurations for Strapi packages'
package: 'tsconfig'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides reusable TypeScript configurations for the Strapi monorepo. Extends `@tsconfig/node20` with strict type-checking and module options consistent across all packages.

## Key concepts

- **Base config**: Enables strict mode, declaration maps, and ESNext modules. Extends Node 20 preset from @tsconfig/node20. See [base.json](https://github.com/strapi/strapi/tree/develop/packages/utils/tsconfig).
- **Client config**: Additional configuration for client-side code.
- **Consumed by**: Core packages (`@strapi/database`, `@strapi/core`, `@strapi/permissions`), plugins, and providers extend these configs in their `tsconfig.build.json`.

## Related

- [TypeScript](../../../contributing/05-typescript.md): TypeScript conventions for the monorepo.
