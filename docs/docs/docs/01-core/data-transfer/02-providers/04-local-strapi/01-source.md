---
title: Source
tags:
  - providers
  - data-transfer
  - experimental
---

# Local Strapi Source Provider

This provider will retrieve data from an initialized `strapi` instance using its Query Engine (`strapi.db.query`).

## Provider Options

The accepted options are defined in `ILocalStrapiSourceProviderOptions`.

```typescript
  getStrapi(): Strapi.Strapi | Promise<Strapi.Strapi>; // return an initialized instance of Strapi

  autoDestroy?: boolean; // shut down the instance returned by getStrapi() at the end of the transfer
```
