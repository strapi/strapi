---
title: Technologies
slug: /openapi/technologies
tags:
  - openapi
  - technologies
  - dependencies
---

# OpenAPI

This section provides an overview of the technologies used in the OpenAPI package

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

### [Zod to OpenAPI](https://github.com/asteasolutions/zod-to-openapi)

> A library that uses [zod schemas](https://github.com/colinhacks/zod) to generate OpenAPI Swagger documentation.

This library is used to transform `zod` schema obtained from Strapi routes objects into valid OpenAPI Schema.

:::info
It is particularly useful to avoid leaking the OpenAPI domain logic into the Strapi core logic.
:::

:::warning
The main pain point of using this library is **not being able to infer, represent, and transform cyclic dependencies between models** (_relations, components, dynamic zones, media_) **in the final schema** without leaking the OpenAPI domain to the Strapi core.

Luckily, `zod` v4 will [soon go stable](https://v4.zod.dev/v4#wrapping-up) and offer the possibility to transform `zod` schema into JSON object natively **and** with cycles’ support.

It would represent a huge opportunity to migrate away from this dependency and use `zod` only.

For more information, see

- https://v4.zod.dev/
- https://v4.zod.dev/json-schema
- https://v4.zod.dev/metadata
  :::

### [Debug](https://github.com/debug-js/debug)

> A tiny JavaScript debugging utility modelled after Node.js core's debugging technique. Works in Node.js and web browsers.

Used to provide detailed information about what is happening during the document generation processes.

The root namespace for the package is `strapi:core:openapi` and each component adds its own suffix.

:::tip
A small wrapper that automatically binds the correct default namespace can be found in the package utils: `src/utils/debug.ts`
:::

### Types

- [`@strapi/types`](https://github.com/strapi/strapi/tree/develop/packages/core/types) provides types to represent core Strapi objects like routes or an application
- [`openapi-types`](https://github.com/kogosoftwarellc/open-api/tree/main/packages/openapi-types) provides types to represent a full OpenAPI document and its sub-objects
