---
title: Lifecycles
description: Lifecycle hooks of content types and components, and their TypeScript types
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

Components can declare database lifecycle hooks in a file that sits next to the component schema and shares its name:

```
src/components/<category>/<name>.json
src/components/<category>/<name>.lifecycles.ts   # .js in JavaScript projects
```

```ts
import type { Event } from '@strapi/database';

export default {
  beforeCreate(event: Event) {
    // event.model.uid === '<category>.<name>'
  },
};
```

A `.js` component schema can also declare a `lifecycles` object inline. The file's hooks override it, hook by hook.

Components accept the same hook names as content types, but not all of them run:

- `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete` and `afterDelete` run when the document service writes the component (see below).
- The find and count hooks never run when an entry is read: its components come through the populate of the entry. They only run for queries on the component itself (`strapi.db.query('<category>.<name>')`), such as the relations of a component in the Content Manager (`findOne`).
- The `*Many` hooks only run for such direct queries. A `*DeleteMany` hook also makes the document service delete the rows of that component one by one, so the loader warns about it: use `beforeDelete` or `afterDelete`, which run for each row.

How it behaves:

- The hooks are attached to the component's database model. They fire for every row of that component: in a content type, in a nested component or in a dynamic zone, and on every write path of the document service (create, update, publish, clone, discard draft, delete).
- The event describes the component row only. The parent entry is not part of it, and a repeatable component fires one event per item. `event.params.data` holds the component's own fields, and also the links to its nested components (`{ id, __pivot }`) when it has some.
- An error thrown from a hook aborts the whole document operation. Document service operations run inside a transaction, so rows already written for the same request are rolled back.
- The file is only loaded for an existing component. A file without a matching schema (for example after deleting the component from the Content-Type Builder, which only removes the `.json`) is ignored with a warning, and so is a file whose name is not exactly `<name>.lifecycles.js` (`.ts` in TypeScript projects), regardless of case.
- An export that is not a hook name is left out, with a warning when it is named like one (`before…` or `after…`), since the loader accepted it before. A hook that is not a function, lifecycles that are not an object, or a file that fails to load stop the application with an error naming the component.

Implementation: discovery in `packages/core/core/src/loaders/components.ts`, validation in `packages/core/core/src/domain/component/validator.ts`, hook names shared with content types in `packages/core/core/src/domain/lifecycles.ts`.
