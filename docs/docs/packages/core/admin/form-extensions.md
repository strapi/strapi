---
title: Admin form extensions
description: 'How a plugin sends, checks and saves its own values with the role, user and API token forms.'
status: draft
review_notes:
  - New experimental API, written with the code; needs a maintainer review.
tags:
  - backend
  - public-api
---

Plugins can send their own values with three admin forms: roles (create, edit, duplicate), users (invite, edit) and content API tokens (create, edit). The admin sends them under `plugins.<pluginId>` in the request body. Core hands them to the plugin and stores none of them. The code is in [`server/src/services/form-extensions.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/server/src/services/form-extensions.ts).

The API is experimental, hence the `unstable_` prefix: it can change in a minor release.

## Adding params

Like `contentAPI.addInputParams` (read [HTTP request path](../../../architecture/06-http-request-path.md)), keys are param names, here the plugin ids under `plugins`:

```ts
strapi.service('admin::form-extensions').unstable_addInputParams('role', {
  'my-plugin': {
    schema: (z) => z.object({ teams: z.array(z.string()).min(1) }),
    validate: async (values, { entityId, user }) => {
      // throw a ValidationError to refuse the save
    },
    beforeSave: async ({ values, data, entityId, user }) => data,
    afterSave: async ({ values, entityId, user }) => {
      // store the values in the plugin's own tables
    },
  },
});
```

- Forms: `role`, `user`, `api-token`. A plugin calls it in `register` or `bootstrap`. Adding the same plugin id twice to a form throws.
- `schema` (optional): a Zod schema, or a factory that gets Strapi's Zod. It checks the values when the body has them. Errors answer 400 with a path under `plugins.<pluginId>`.
- `validate` (optional): checks that need more than the shape, such as the database. It runs before core saves, also when the body has no values for the plugin, so a plugin can refuse a save it does not allow. Throw a `ValidationError` to answer 400.
- `beforeSave` (optional): returns the core values to save. For example, a plugin that manages user roles per space merges the roles of the current space with the roles the user holds elsewhere.
- `afterSave` (optional): runs once core has saved the entity, with its id. It does not run when nothing was saved, for example on an update of a missing entity.
- `user` is the admin user who sends the form. `entityId` is missing when the form creates the entity.

## What core does on a save

1. Takes `plugins` out of the body, so core's own validation never sees it.
2. Runs its own checks, as without plugins.
3. Refuses a key under `plugins` that no plugin added to the form (400).
4. For each plugin of the form, in the order they were added: `schema`, then `validate`.
5. Runs every `beforeSave`, then saves, then runs every `afterSave`.

The steps run in the controllers of the CE and EE role, user and API token routes. Core answers never contain plugin values: on edit, a plugin loads its own values from the entity id.

Core and plugin saves are not one transaction: if an `afterSave` fails, the entity stays saved. Keep the checks in `schema` and `validate` so that `afterSave` rarely fails.

## Related

- [`@strapi/admin`](./index.md): the server part and its services.
