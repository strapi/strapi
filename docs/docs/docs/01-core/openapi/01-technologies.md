---
title: Technologies
slug: /openapi/technologies
tags:
  - openapi
  - technologies
  - dependencies
---

# OpenAPI

This section provides an overview of the technologies used in the OpenAPI package.

---

## Tools

The OpenAPI package uses the same tools as the rest of the Strapi monorepo packages:

| Tool     | Purpose         |
| -------- | --------------- |
| Jest     | Unit testing    |
| Rollup   | Build           |
| Prettier | Code formatting |
| ESLint   | Code linting    |

## Dependencies

The package focuses on using a limited set of external dependencies to keep a light footprint.

---

### [Zod](https://github.com/colinhacks/zod)

Route objects carry Zod schemas on `route.request` and `route.response`. Assemblers convert those schemas into OpenAPI parameters, request bodies, and response objects via `z.toJSONSchema` (see `src/utils/zod.ts` and the `ComponentsWriter` post-processor).

:::info
Keeping schemas on routes avoids leaking OpenAPI domain logic into Strapi core.
:::

:::warning
Cyclic dependencies between models (_relations, components, dynamic zones, media_) remain difficult to represent accurately in the final component schemas.
:::

### [Debug](https://github.com/debug-js/debug)

> A tiny JavaScript debugging utility modelled after Node.js core's debugging technique. Works in Node.js and web browsers.

Used to provide detailed information about what is happening during the document generation processes.

The root namespace for the package is `strapi:core:openapi` and each component adds its own suffix.

:::tip
A small wrapper that automatically binds the correct default namespace can be found in the package utils: `src/utils/debug.ts`

Enable debug output with `DEBUG=strapi:core:openapi:*`.
:::

### Types

- [`@strapi/types`](https://github.com/strapi/strapi/tree/develop/packages/core/types) provides types to represent core Strapi objects like routes or an application
- [`openapi-types`](https://github.com/kogosoftwarellc/open-api/tree/main/packages/openapi-types) provides types to represent a full OpenAPI document and its sub-objects
