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
- `schema` (optional): a Zod schema, or a factory that gets Strapi's Zod. It checks the values when the body has them. Errors answer 400 with a path under `plugins.<pluginId>`. The steps below get the values with the type the schema returns when `schema` is a schema (`z` from `@strapi/utils`) or a factory with a typed parameter. Values are `undefined` when the body has none.
- `validate` (optional): checks that need more than the shape, such as the database. It runs before core checks, also when the body has no values for the plugin, so a plugin can refuse a save it does not allow. Throw a `ValidationError` to answer 400. Without field errors in its details, core reports it at `plugins.<pluginId>`, so the admin shows it on the plugin's field. The same goes for `beforeSave` and `afterSave`.
- `beforeSave` (optional): returns the core values that core then checks and saves. For example, a plugin that manages user roles per space merges the roles of the current space with the roles the user holds elsewhere: the form can send no role for the space, and core still requires one role at least once merged.
- `afterSave` (optional): runs once core has saved the entity, with its id. It does not run when nothing was saved, for example on an update of a missing entity.
- `user` is the admin user who sends the form. `entityId` is missing when the form creates the entity.

## What core does on a save

1. Takes `plugins` out of the body, so core's own validation never sees it.
2. Refuses a key under `plugins` that no plugin added to the form (400).
3. For each plugin of the form, in the order they were added: `schema`, then `validate`.
4. Runs every `beforeSave`.
5. Runs its own checks on the values `beforeSave` returned, as without plugins: validation, unique names and emails, the EE seat limit, and on edit whether the entity exists.
6. Saves, then runs every `afterSave`.

So `validate` and `beforeSave` get the values as sent, before core has checked them, and also run for an entity that does not exist or that core refuses to change, such as the Super Admin role.

The save and the `afterSave` steps are not one transaction: if an `afterSave` throws, the entity stays saved and the request answers with the error (400 for a `ValidationError`, 500 otherwise). Keep the checks in `schema` and `validate` so that `afterSave` rarely fails. Inside a transaction, core could no longer retry a deadlock on its own, for example between two admins changing the roles of users who share one.

Plugin errors come first: a body with both plugin and core errors answers with the plugin ones.

The steps run in the controllers of the CE and EE role, user and API token routes. Core answers never contain plugin values: on edit, a plugin loads its own values from the entity id.

Other ways to create users skip the plugin steps: the first admin registration, the `admin:create-user` CLI command, and SSO auto-registration in EE. A plugin that needs values for every user handles these users itself, for example with a default.

## Related

- [`@strapi/admin`](./index.md): the server part and its services.
