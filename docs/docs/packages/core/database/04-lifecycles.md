---
title: Lifecycles
description: TypeScript types for content-type lifecycle hooks and database lifecycle subscribers
tags:
  - typescript
---

Content-type lifecycle hooks (`src/api/<api>/content-types/<content-type>/lifecycles.ts`) and the subscribers of `strapi.db.lifecycles.subscribe` receive a database lifecycle event. How the event is typed depends on strict types ([Strict types in applications](../../../contributing/05-typescript.md#strict-types-in-applications)).

## Without strict types

Hooks receive the `Event` type of `@strapi/database`. Import it to annotate a hook:

```ts
import type { Event } from '@strapi/database';

export default {
  async beforeCreate(event: Event) {
    const { data } = event.params;
    // ...
  },
};
```

The `Event` type includes `action`, `model`, `params`, `state`, and optional `result`. It is defined in `@strapi/database` alongside the lifecycle subscriber implementation. The values of `params` and `result` are `any`. The hooks of `strapi.db.lifecycles.subscribe` receive the same `Event`.

## With strict types

The types live in [`modules/lifecycles.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/types/src/modules/lifecycles.ts) of `@strapi/types`.

### Content-type lifecycles

Check the default export of `lifecycles.ts` with `satisfies Core.Lifecycles<'<uid>'>`. Each hook receives the event of its action, typed from the content type's registered schema:

```ts
import type { Core } from '@strapi/strapi';

export default {
  beforeCreate(event) {
    const { data } = event.params;

    if (typeof data?.title === 'string') {
      data.title = data.title.trim();
    }
  },
  afterCreate(event) {
    strapi.log.debug(`Created article ${event.result.documentId}`);
  },
} satisfies Core.Lifecycles<'api::article.article'>;
```

`examples/strict-types` uses this file, and `checks/common-patterns.ts` pins its event types.

Without strict types, `Core.Lifecycles` types each hook with the database `Event`, so the same file compiles with strict types on and off.

In a JavaScript file, put the type on a `const` and export it. The `@satisfies` tag on `module.exports =` does not type the hooks. TypeScript reports errors in the file only when it is checked (`// @ts-check` or `checkJs`):

```js
// @ts-check
/** @satisfies {import('@strapi/strapi').Core.Lifecycles<'api::article.article'>} */
const lifecycles = {
  afterCreate(event) {
    strapi.log.debug(`Created article ${event.result.documentId}`);
  },
};

module.exports = lifecycles;
```

### Subscribers

`strapi.db.lifecycles.subscribe` types the hooks of a subscriber object by its `models`. For a registered model, they receive the same events as `Core.Lifecycles`:

```ts
strapi.db.lifecycles.subscribe({
  models: ['api::article.article'],
  afterCreate(event) {
    // `event.result` is an article entry.
  },
});
```

Hooks receive `AnyEvent` (entries are `Record<string, unknown>`) in these cases:

- a function subscriber, which receives every event of every model. Narrow it by `event.action`;
- a subscriber object without `models`, whose hooks run for every model;
- a `models` list known only at runtime, such as a `string[]`;
- a model whose schema is not registered.

A subscriber on several models receives the union of their events. TypeScript does not narrow the union by `event.model.uid`, a nested property. Narrow the entry with `in`, or add one subscriber per model:

```ts
strapi.db.lifecycles.subscribe({
  models: ['api::article.article', 'plugin::upload.file'],
  afterUpdate(event) {
    if ('title' in event.result) {
      // `event.result` is an article entry.
    }
  },
});
```

### What the event types

- `params` are typed by query: `data` on writes (an array for `createMany`), and `where`. On `before*` events, every param is optional, because the query checks `data` and `where` after the hook.
- `params.data` and `params.where` are keyed by the model's attribute names, `id` and `documentId` (plus `$and`, `$or` and `$not` for `where`). Their values are `unknown`. The database layer passes its callers' values through: through the Document Service, relations are `{ set | connect | disconnect }` objects, components `{ id, __pivot }`, and dates any format the caller passed. A raw `strapi.db.query` call passes any value. Narrow a value before you use it, as `typeof data?.title === 'string'` does above.
- The other params (`filters`, `select`, `populate`, `orderBy` and so on) are `unknown`.
- `result` exists on `after*` events only. It is typed from the schema: an entry (`findOne` adds `null`), an array of entries, a count, or `{ count, ids }` for `createMany`. Attributes are optional, because `select` and `populate` pick them. `id` and `documentId` are required.
- `afterCreate` and `afterUpdate` results are typed non-null. Known limit: the query reads the entry back with the caller's `filters`, so the result is `null` at runtime when they exclude the entry just written.
- `state` is `Record<string, unknown>`, shared by the `before*` and `after*` hooks of one query.
