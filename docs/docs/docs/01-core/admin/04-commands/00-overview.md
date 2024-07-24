---
title: Overview
tags:
  - commands
  - admin
---

The following commands are exported from the `@strapi/admin` package and are contained under the `_internal` folder:

- [`build`](build)
- [`develop`](develop)

Each CLI command also has a node API equivalent. These can be imported from `@strapi/admin/_internal`:

```ts
import { build } from '@strapi/admin/_internal';

await build({
  // ...
});
```
