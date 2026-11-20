---
title: Source
description: 'Guide to using local Strapi instance as a data source.'
tags:
  - providers
---

# Local Strapi Source Provider

This provider will retrieve data from an initialized `strapi` instance using its Query Engine (`strapi.db.query`).

## Bootstrap

`bootstrap()` loads the JSONL stream packages before it reads the Strapi instance or disables database lifecycles. On a remote pull, the server runs this while the CLI engine is still bootstrapping, which is before the CLI destination `beforeTransfer()` moves or deletes local uploads. A missing package on the server fails the pull there. Later stage reads reuse that load.

## Provider Options

The accepted options are defined in `ILocalStrapiSourceProviderOptions`.

```typescript
  getStrapi(): Strapi.Strapi | Promise<Strapi.Strapi>; // return an initialized instance of Strapi

  autoDestroy?: boolean; // shut down the instance returned by getStrapi() at the end of the transfer
```
