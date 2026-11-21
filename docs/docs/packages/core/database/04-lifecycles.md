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

The `Event` type includes `action`, `model`, `params`, `state`, and optional `result`. It is defined in `@strapi/database` alongside the lifecycle subscriber implementation.

## Component lifecycles

Components can declare the same hooks. The file sits next to the component schema and shares its name:

```
src/components/<category>/<name>.json
src/components/<category>/<name>.lifecycles.ts   # .js in JavaScript projects
```

```ts
import type { Event } from '@strapi/database';

export default {
  beforeCreate(event: Event) {
    // event.model.uid === '<category>.<name>'
    // event.params.data holds the component's own fields only
  },
};
```

How it behaves:

- The hooks are attached to the component's database model, exactly like content-type lifecycles. They fire for every row of that component, whichever content type embeds it, and on every write path that goes through the document service (create, update, publish, clone, discard draft, delete).
- The event describes the component row only. The parent entry is not part of the event, and a repeatable component fires one event per item.
- An error thrown from a hook aborts the whole document operation. Document service operations run inside a transaction, so rows already written for the same request are rolled back.
- A lifecycles file without a matching schema (for example after deleting the component from the Content-Type Builder, which only removes the `.json`) is ignored with a warning at startup.
- A module that declares an unknown hook name, or a value that is not a function, fails the application load with an error naming the component.

Implementation: discovery in `packages/core/core/src/loaders/components.ts`, validation in `packages/core/core/src/domain/component/validator.ts`, hook names shared with content types in `packages/core/core/src/domain/lifecycles.ts`.
