---
title: Usage
slug: /openapi/usage
tags:
  - openapi
  - usage
  - api
toc_max_heading_level: 4
---

# OpenAPI

This section explores the Strapi OpenAPI toolset

---

## `generate`

Generate an OpenAPI JSON document based on the given Strapi application.

By default, it collects content API routes registered in the application, transforms them into OpenAPI path objects, and fills in other OpenAPI components.

### Signature

```typescript
function generate(strapi: Core.Strapi, options?: GeneratorOptions): GeneratorOutput;
```

### Parameters

- `strapi`, the Strapi application to generate an OpenAPI specification for
- `options`, optional configuration for the generation process

### Return Value

A generation output object, containing:

- `document`, the generated OpenAPI specification, as JSON.
- `stats`, statistics about the generation process
