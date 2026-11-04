---
title: Lifecycles
description: TypeScript types for content-type lifecycle hooks
tags:
  - typescript
---

Content-type lifecycle hooks (`src/api/<api>/content-types/<content-type>/lifecycles.ts`) receive a database lifecycle `Event` object.

For TypeScript projects, import the type from `@strapi/database`:

```ts
import type { Event } from '@strapi/database';

export default {
  async beforeCreate(event: Event) {
    const { data } = event.params;
    // ...
  },
};
```

The `Event` type includes `action`, `model`, `params`, `state`, and optional `result`. It is declared in `@strapi/types` as `Modules.Database.Event`, and `@strapi/database` re-exports it under its own name. Import it from `@strapi/database`: the `@strapi/types` declaration is internal.
