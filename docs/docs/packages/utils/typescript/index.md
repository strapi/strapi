---
title: '@strapi/typescript-utils'
sidebar_label: 'typescript'
description: 'TypeScript support utilities for Strapi applications'
package: '@strapi/typescript-utils'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides TypeScript compilation utilities and code generators for Strapi. Used internally by the Strapi CLI to compile TypeScript projects and generate boilerplate code for APIs, controllers, services, and content types.

## Key concepts

- **Compiler interface**: `compile()` function compiles TypeScript in a source directory using detected tsconfig. Supports configurable compiler options. See [compile.ts](https://github.com/strapi/strapi/tree/develop/packages/utils/typescript).
- **Compilers**: Basic TypeScript compiler and common utilities for handling configuration, paths, and diagnostics.
- **Generators**: Templates and utilities to scaffold API routes, controllers, services, models, components, and content types.

## Related
