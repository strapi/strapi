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

## Attribute modifiers

The schema generators (`src/generators/common/models/attributes.ts`) write each attribute as its base type, such as `Schema.Attribute.String`, intersected with one modifier per schema option: `Required`, `Private`, `Unique`, `Configurable`, `CustomField`, `SetPluginOptions`, `SetMinMax`, `SetMinMaxLength` and `DefaultTo`. `DefaultTo` is written only for a literal default: a function or `null` default writes nothing.

`@strapi/types` reads these modifiers. `Required` and `DefaultTo` decide which keys the strict Document Service write inputs require (see [document write path](../../../architecture/05-document-write-path.md#validation)).

With `typescript.strictTypes`, the generators also write `Schema.Attribute.Conditional` on an attribute with a `conditions.visible` rule. A hidden field skips validation, so the strict write inputs make a conditional attribute optional and nullable. With strict types, each attribute also gets a JSDoc line with its write rule when it has one, for example ``Required when published. `null` only in drafts.`` (`getAttributeWriteRule`). Editors show it on the input keys of the Document Service. Without strict types, the generators write no strict-only modifier and no comment, and generated files stay as in previous releases. Unit tests in `src/__tests__/generators/schemas/` check both outputs.

## Related
