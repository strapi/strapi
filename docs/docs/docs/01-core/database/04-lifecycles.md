---
title: Lifecycles
description: TypeScript types for content-type lifecycle hooks
tags:
  - database
  - lifecycles
  - typescript
---

Content-type lifecycle hooks (`src/api/<api>/content-types/<content-type>/lifecycles.ts`) receive a database lifecycle `Event` object.

For TypeScript projects, import the type from `@strapi/database` or `@strapi/strapi`:

```ts
import type { Event } from '@strapi/database';

export default {
  async beforeCreate(event: Event) {
    const { data } = event.params;
    // ...
  },
};
```

`@strapi/strapi` re-exports the same type for apps that only depend on the main package:

```ts
import type { Event } from '@strapi/strapi';
```

The `Event` type includes `action`, `model`, `params`, `state`, and optional `result`. It is defined in `@strapi/database` alongside the lifecycle subscriber implementation.
