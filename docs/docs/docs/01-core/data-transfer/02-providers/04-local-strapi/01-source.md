---
title: Source
tags:
  - providers
  - data-transfer
  - experimental
---

# Local Strapi Source Provider

This provider will retrieve data from an initialized `strapi` instance using its Entity Service and Query Engine.

## Provider Options

The accepted options are defined in `ILocalFileSourceProviderOptions`.

```typescript
  getStrapi(): Strapi.Strapi | Promise<Strapi.Strapi>; // return an initialized instance of Strapi

  autoDestroy?: boolean; // shut down the instance returned by getStrapi() at the end of the transfer
```
