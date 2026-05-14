---
title: Introduction
slug: /openapi
tags:
  - openapi
---

# OpenAPI

This section provides an overview of the OpenAPI package for Strapi.

---

```mdx-code-block
import DocCardList from '@theme/DocCardList';
import { useCurrentSidebarCategory } from '@docusaurus/theme-common';

<DocCardList items={useCurrentSidebarCategory().items} />
```

## Introduction

The Strapi OpenAPI package offers a comprehensive set of utilities for creating and manipulating OpenAPI specifications based on Strapi applications.

It features a user-friendly API, a maintainable and extensible codebase, and thorough documentation.

:::info
For more information about OpenAPI, please refer to [the official specification](https://swagger.io/specification/)
:::

## Context

From Strapi `v3-alpha` through `v5` (since its [initial release in December 2018](https://medium.com/strapi/introducing-the-api-documentation-swagger-plugin-29092af2c880)), the [official documentation plugin](https://www.npmjs.com/package/@strapi/plugin-documentation) has been the standard solution for integrating Strapi with OpenAPI.

This plugin provided automatic documentation generation, extensive customization options, and a Swagger UI interface.

However, after six years of evolving the CMS, the documentation plugin has become outdated and prone to bugs. Meanwhile, new requirements have emerged from both the community (SDK generation, Swagger support, etc.) and internal tooling needs (Strapi client, API playground, etc.).

It's within this context that we've developed this new package, designed to offer specialized features while remaining flexible enough for broad application.

## Scope

**What it does ✅**

This package provides APIs and tools to:

- Programmatically generate OpenAPI documents **specifically** tailored for Strapi applications
- Validate generated documents for compliance and accuracy
- Customize the document generation process to suit your needs

**What it's not intended to be ❌**

- A direct replacement for the documentation plugin (including Swagger UI)
- A generic OpenAPI specification generator for non-Strapi applications
- A tool for generating OpenAPI documents as static files
- A command-line interface (CLI)

### Limitations

- Currently unable to represent cyclical references (awaiting zod v4), which are temporarily represented as simple "any" objects
- Limited customization capabilities in the current version; these will be expanded in future releases (our priority is making it ready for client use before iterating further)
