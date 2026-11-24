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

Plugins can send their own values with three admin forms: roles (create, edit, duplicate), users (invite, edit) and content API tokens (create, edit). Requests carry them under `plugins.<pluginId>` in the body. Core hands them to the plugin and stores none of them. The code is in [`server/src/services/form-extensions.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/server/src/services/form-extensions.ts).

The API is experimental, hence the `unstable_` prefix: it can change in a minor release.

## Adding params

Like `contentAPI.addInputParams` (read [HTTP request path](../../../architecture/06-http-request-path.md)), keys are param names, here the plugin ids under `plugins`:

```ts
import { errors, z } from '@strapi/utils';
import type { unstable_FormExtensionsService } from '@strapi/admin/strapi-server';

const formExtensions = strapi.service('admin::form-extensions') as unstable_FormExtensionsService;

formExtensions.unstable_addInputParams('role', {
  'my-plugin': {
    schema: z.object({ teams: z.array(z.string()).min(1) }),
    validate: async ({ values, entityId, user }) => {
      // throw new errors.ValidationError('...') to refuse the save
    },
    beforeSave: async ({ values, data, entityId, user }) => data,
    afterSave: async ({ values, entityId, user }) => {
      // store the values in the plugin's own tables
    },
  },
});
```

- Forms: `role`, `user`, `content-api-token` (content API tokens only). A plugin calls it in `register` or `bootstrap`. Adding the same plugin id twice to a form throws.
- Types: `strapi.service()` returns an untyped service, so cast it as above. `unstable_FormInputParam` and `unstable_ExtensibleForm` are exported too.
- `schema` (optional): a Zod schema, or a factory that gets Strapi's Zod. Anything else throws when the param is added. It checks the values when the body has them, and can be async (an async `refine` or `transform`). Errors answer 400 with a path under `plugins.<pluginId>`. The steps below get the values with the type the schema returns when `schema` is a schema (`z` from `@strapi/utils`) or a factory with a typed parameter. Values are `undefined` when the body has none.
- `validate` (optional): checks that need more than the shape, such as the database. It runs before core checks, also when the body has no values for the plugin, so a plugin can refuse a save it does not allow. Throw a `ValidationError` to answer 400: returning a value, such as `false`, refuses nothing, so core treats it as a plugin bug and answers 500. Without field errors in its details, core adds one at `plugins.<pluginId>`, so the admin shows it on the plugin's field, and keeps the other details, such as a `code`. The same goes for `beforeSave`.
- `beforeSave` (optional): returns the core values that core then checks and saves. Returning anything but an object is a plugin bug and answers 500. With several plugins, each one gets what the previous one returned. For example, a plugin that manages user roles per space merges the roles of the current space with the roles the user holds elsewhere: the form can send no role for the space, and core still requires one role at least once merged.
- `afterSave` (optional): runs once core has saved the entity, with its id. It does not run when nothing was saved, for example on an update of a missing entity. Any error it throws, a `ValidationError` included, answers 500: the entity is already saved, and a client that takes a 400 for "nothing happened" would save it again. Every plugin's `afterSave` runs even when another one fails; the 500 then names each plugin that failed.
- `user` is the admin user who sends the form. With an admin token, it is the token's owner: plugins do not see the token's own, narrower permissions.
- `entityId`: on update, `validate` and `beforeSave` get the route id, as a number when it is a decimal such as `07` (which gives `7`, the row the database matches) and as sent otherwise; `afterSave` gets the saved id. On create, it is missing in `validate` and `beforeSave`.

## What core does on a save

1. Takes `plugins` out of the body, so core's own validation never sees it. A body that is not an object, such as an array, goes to core's validation as sent, without plugin steps, and core refuses it as before. On API token create, core first keeps only its own fields and trims the name and description, and trims them again after the plugin steps.
2. Refuses a `plugins` value that is not an object (400, path `plugins`) and a key that no plugin added to the form (400, path `plugins.<key>`). `plugins: {}` and `plugins: null` mean no values.
3. For each plugin of the form, in the order they were added: `schema`, then `validate`.
4. Runs every `beforeSave`.
5. Runs its own checks on the values `beforeSave` returned, as without plugins: validation, trimming on API token update, unique names and emails, the Super Admin guard, whether the entity exists, and on EE user update the seat limit when the user is activated. On EE user create, the seat limit is checked first, before the plugin steps.
6. Saves, then runs every `afterSave`.

So `validate` and `beforeSave` get the values before core has checked them, and also run for an entity that does not exist or that core refuses to change, such as the Super Admin role: core then answers 404 or 400 and no `afterSave` runs. Core keeps its own order of checks, so with no plugin added to the form, a request without a `plugins` key gets the same answer as before. A plugin's `validate` runs on every request of its form, also without values, and can refuse it.

Without a plugin, three things differ from a body that core validated alone: `plugins: {}` and `plugins: null` are accepted on every route; any other `plugins` value is refused with a path under `plugins`; and on API token create, a `plugins` key is refused instead of ignored.

The save and the `afterSave` steps are not one transaction: if an `afterSave` throws, the entity stays saved and the request answers 500. Keep the checks in `schema` and `validate` so that `afterSave` rarely fails. Inside a transaction, core could no longer retry a deadlock on its own, for example between two admins changing the roles of users who share one.

Plugin errors come first: a body with both plugin and core errors answers with the plugin ones.

The steps run in the controllers of the CE and EE role, user and content API token routes. Core answers never contain plugin values: on edit, a plugin loads its own values from the entity id.

Form extensions are not an access-control hook: only the role, user and content API token create and update routes run them. Everything else skips the plugin steps. For example, and this list is not complete:

- users created or changed elsewhere: the first admin registration, accepting an invite, forgot and reset password, the `admin:create-user` CLI command, SSO auto-registration in EE, and EE seat enforcement, which deactivates users;
- roles created at bootstrap;
- `PUT /admin/users/me` (the user's own profile);
- `PUT /admin/roles/:id/permissions` (role permissions);
- API token regenerate, and admin tokens;
- deletes of roles, users and tokens.

A plugin that needs values for every user handles the users created elsewhere itself, for example with a default.

## Related

- [`@strapi/admin`](./index.md): the server part and its services.
