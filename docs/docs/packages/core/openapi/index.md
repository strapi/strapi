---
title: '@strapi/openapi'
sidebar_label: 'openapi'
description: 'Generates OpenAPI documents for Strapi applications through providers, matchers, assemblers and processors.'
package: '@strapi/openapi'
status: draft
review_notes:
  - The last sentence of Purpose, the concept list at the start of Key concepts, and Related are new. They were written from the package source on develop and need a maintainer review. The other text is moved from the previous page.
---

## Purpose

The Strapi OpenAPI package offers a comprehensive set of utilities for creating and manipulating OpenAPI specifications based on Strapi applications.

It features a user-friendly API, a maintainable and extensible codebase, and thorough documentation.

The package runs on the server. `@strapi/core` uses it to serve the `/openapi.json` endpoints, and the `strapi openapi generate` command in `@strapi/strapi` uses it to write a specification file.

:::info
For more information about OpenAPI, please refer to [the official specification](https://swagger.io/specification/)
:::

### Context

From Strapi `v3-alpha` through `v5` (since its [initial release in December 2018](https://medium.com/strapi/introducing-the-api-documentation-swagger-plugin-29092af2c880)), the [official documentation plugin](https://www.npmjs.com/package/@strapi/plugin-documentation) has been the standard solution for integrating Strapi with OpenAPI.

This plugin provided automatic documentation generation, extensive customization options, and a Swagger UI interface.

However, after six years of evolving the CMS, the documentation plugin has become outdated and prone to bugs. Meanwhile, new requirements have emerged from both the community (SDK generation, Swagger support, etc.) and internal tooling needs (Strapi client, API playground, etc.).

It's within this context that we've developed this new package, designed to offer specialized features while remaining flexible enough for broad application.

## Key concepts

The [Architecture](./02-architecture.md) page describes each concept with diagrams. The [Contributing](./contributing/00-overview.mdx) guides explain how to extend each one.

- **`generate()`**: the public entry point, exported from `src/exports.ts`. It builds the pipeline and returns `{ document, durationMs }`. It is experimental. See [Usage](./03-usage.md).
- **Route collection**: a `RouteCollector` reads routes from providers (`AdminRoutesProvider`, `ApiRoutesProvider`, `PluginRoutesProvider`) and keeps the routes that a `RouteMatcher` accepts. A matcher holds rules, for example `isOfType`, which compares `route.info.type`. See [Routes provider](./contributing/01-routes-provider.md) and [Routes matcher rule](./contributing/02-routes-matcher-rule.md).
- **Generator**: `OpenAPIGenerator` in `src/generator` creates the context, then runs the pre-processors, the assemblers and the post-processors in this order.
- **Assemblers**: each assembler writes one part of the document. The default set covers metadata, info, servers, security and paths. The paths assembler delegates to sub-assemblers with their own contexts. See [Assemblers](./contributing/03-assemblers.md).
- **Context**: a `Context` holds the Strapi instance, the collected routes, the registries and the output in `context.output.data`. Context factories create the document, path, path item and operation contexts. See [Context factory](./contributing/04-context-factory.md).
- **Processors**: pre-processors prepare the context before assembly, and post-processors finish the output after it. The default post-processor, `ComponentsWriter`, converts the schemas in `strapi.contentAPISchemaRegistry` (Zod) into `components.schemas`. There is no default pre-processor. See [Processors](./contributing/05-processors.md).
- **Registries**: the shared state of one generation run. `RegistriesFactory` creates them. Today they hold `extractedComponentSchemas`.

### Scope

**What it does ✅**

This package provides APIs and tools to:

- Programmatically generate OpenAPI documents **specifically** tailored for Strapi applications
- Customize the document generation process through providers, matchers, assemblers, and processors

**What it's not intended to be ❌**

- A direct replacement for the documentation plugin (including Swagger UI)
- A generic OpenAPI specification generator for non-Strapi applications
- A standalone file writer (generation returns an in-memory document; see [Usage](./03-usage.md) for the experimental CLI wrapper)

### Limitations

- Cyclical references between models (_relations, components, dynamic zones, media_) are not fully represented in component schemas yet
- Limited customization capabilities in the current version; these will be expanded in future releases (our priority is making it ready for client use before iterating further)

## Related

- [Extension points](../../../architecture/04-extension-points.md): how plugins and APIs declare the routes that the providers collect.
- [Server lifecycle](../../../architecture/02-server-lifecycle.md): the route providers read `strapi.apis` and `strapi.plugins`, which the load phase fills.
- [`@strapi/core`](../core/index.md): serves the `/openapi.json` endpoints through its server service.
- [`@strapi/strapi`](../strapi/index.md): hosts the `strapi openapi generate` command.
- [`documentation` plugin](../../plugins/documentation/index.md): the older OpenAPI solution that this package does not replace.
- [Technologies](./01-technologies.md): tools and dependencies of the package.
