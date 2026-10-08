---
title: 'create-strapi'
sidebar_label: 'create-strapi'
description: 'Alias CLI for creating new Strapi projects via npm init'
package: 'create-strapi'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

Provides an alternative entry point for Strapi app developers to create new projects. Delegates to `create-strapi-app`. Available via `npm init strapi@latest`, `yarn create strapi@latest`, and `npx create-strapi@latest`.

## Key concepts

- **Wrapper package**: Delegates to create-strapi-app/bin at [index.js](https://github.com/strapi/strapi/tree/develop/packages/cli/create-strapi). Exists for npm init/pnpm create integration.
- **Same functionality**: Offers the same project scaffolding and prompts as create-strapi-app.

## Related

- [`create-strapi-app`](../create-strapi-app/index.md): primary package that provides the actual CLI.
