---
title: How Permissions Work
description: 'Explanation of how permissions are evaluated and enforced in admin.'
tags:
  - rbac
---

## Overview

The RBAC permission system relies under the hood on the [CASL](https://casl.js.org) library.

A `permission` is the combination of an `action`, a `subject`, some `properties` and some `conditions`.
The logic is that: a user can perform an `action` on a `subject` and some of its `properties` only if its role has the `permission` and if the `conditions` associated to the permission pass.
The creation and edition of permissions is done through the [edit page](http://localhost:1337/admin/settings/roles/2) of a role by checking or unchecking checkboxes.

Example 1: the action `update` can be applied on the subject `article` and property `title`, this result is the permission to update the title of an article.

Example 2: the condition `isCreator` added to the previous permission will ensure that only the creator of the article can update the title.

Example 3: the action `access the Marketplace page` has no subject to apply on. The permission only contains the action `admin::marketplace.read`.

The permissions are attached to a role. Each role can have different permissions independently. There is no inheritance system.
To check if an action can be performed by a user, frontend and backend simply retrieve the list of the permissions associated with the user's roles and check if it contains the permission associated with the action about to be performed. The backend also runs the associated conditions.

:::tip
If a user has several roles, the user will be allowed to perform an action if at least one of its roles is allowed to perform it.
:::

## Actions

### Action definition

An action contains the following information:

| key                           | description                                                                                                                                                                                                                 | type   | required | Default value | example                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- | ------------- | -------------------------- |
| **uid**                       | An id that has to be unique within the plugin.                                                                                                                                                                              | string | required | -             | `'audit-logs.read'`        |
| **pluginName**                | Name of the plugin registering the action.                                                                                                                                                                                  | string | -        | `'api'`       | `'admin'`                  |
| **section**                   | Name of the section among `contentTypes`, `plugins`, `settings` and `internal`. It will define in which permission tab the action will appear. <br/> `internal` is not displayed in any tab but used for internal purposes. | string | required | -             | `'settings'`               |
| **category**                  | Name of the category. It will define in which category the action will appear. _Only for the plugins and settings section_.                                                                                                 | string | -        | -             | `'audit logs'`             |
| **subCategory**               | Name of the subcategory. It will define in which subcategory or the category the action will appear. _Only for the plugins and settings section_.                                                                           | string | -        | -             | `'options'`                |
| **displayName**               | Human name of the action.                                                                                                                                                                                                   | string | required | -             | `'Read'`                   |
| **subjects**                  | List of subjects the action can be applied to. _Only for the contentTypes section_.                                                                                                                                         | array  | -        | -             | `['api::article.article']` |
| **options**                   | Option object                                                                                                                                                                                                               | object | -        | `{}`          | `{}`                       |
| **options.applyToProperties** | List of properties the action can be applied to. _Only for the contentTypes section_.                                                                                                                                       | -      | -        | `[]`          | `['fields', 'locale']`     |

![Screenshot of the RBAC edit page showing the where are located the section, category, subcategory and display name](/img/permissions/rbac-edit-page.png)

_above: Screenshot of the RBAC edit page showing the where are located the section, category, subcategory and display name_

:::note
`uid` and `pluginName` are used to create a global unique id.

Examples: `admin::audit-logs.read`, `plugin::content-manager.explorer.create`
:::

### Register an action

An action can be registered in the backend during the `bootstrap` phase of the app.

Example:

```ts
// bootstrap.ts
module.exports = async () => {
  const actions = [
    {
      uid: 'provider-login.read',
      displayName: 'Read',
      pluginName: 'admin',
      section: 'settings',
      category: 'single sign on',
      subCategory: 'options',
    },
  ];
  await strapi.service('admin::permission').actionProvider.registerMany(actions);
};
```

### Parametrize actions

Actions can be parametrized with the `actionParameters` property. This property is an object that can contain any key/value pair.

An example of the feature:

- The action `review-workflows.stage.transition` can be parametrized with the `from` and `to` parameters, which are the ids of the stages a user can transition from and to.

At the moment only Review Workflows use this feature internally.

## Conditions

### Condition definition

A condition contains the following information:

| key             | description                                                                                                                                                                                        | type   | required | default value | example        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- | ------------- | -------------- |
| **displayName** | The condition name as shown in the admin panel                                                                                                                                                     | string | required | -             | `'Is creator'` |
| **name**        | A name that has to be unique within the plugin                                                                                                                                                     | string | required | -             | `'is-creator'` |
| **plugin**      | Name of the plugin that register the condition                                                                                                                                                     | string | -        | `'api'`       | `'admin'`      |
| **category**    | Name of the category. Conditions can be grouped into categories available in the admin panel                                                                                                       | string | -        | `'Default'`   | `'admin'`      |
| **handler**     | A function used to verify the condition (see [docs.strapi.io](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/rbac.html#using-the-condition-handler)) | string | required | -             | `'admin'`      |

:::note
Currently the user can choose to apply a condition on any action. There is no way to define a list of actions on which the condition can be applied to. This is why it is possible to set the condition `isCreator` on a the action `plugin::content-manager.explorer.create` even if it doesn't make sense.
:::
:::note
`name` and `plugin` are used to create a global unique id.

Examples: `admin::is-creator`
:::

### Registering a condition

A condition can be registered in the backend during the `bootstrap` phase of the app.

Example:

```ts
// bootstrap.ts
module.exports = async () => {
  const conditions = [
    {
      displayName: 'Is creator',
      name: 'is-creator',
      plugin: 'admin',
      handler: (user) => ({ 'createdBy.id': user.id }),
    },
  ];
  await strapi.service('admin::permission').conditionProvider.registerMany(conditions);
};
```

More information on how the handler works [here](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/rbac.html#using-the-condition-handler).

## Permissions

### Permission definition

The permissions are modified in the admin panel (on the [edit page](http://localhost:1337/admin/settings/roles/2) of a role) and stored in the database with the following information:

| key                  | description                                                                                                                | type   | required | example                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ | -------- | ------------------------------------------------------------- |
| **action**           | Id of the action that will be permitted.                                                                                   | string | required | `'plugin::content-manager.explorer.update'`                   |
| **actionParameters** | Object to parametrize actions.                                                                                             | string | -        | `{}`                                                          |
| **subject**          | Id of the subject on which the action will be permitted.                                                                   | string | -        | `'api::article.article'`                                      |
| **properties**       | List of the properties of the subject on which the action will be permitted                                                | object | -        | `{ fields: ['title', 'description'], locales: ['en', 'fr'] }` |
| **conditions**       | List of the conditions that will be ran against an entry to determine whether the action on this entry is permitted or not | array  | -        | `['admin::is-creator']`                                       |

A permission contains all needed information for the backend and the frontend to prevent users to perform non-permitted action.

### Permission ceiling

A user's permissions can act as a ceiling: the set of permissions they are allowed to hand on to someone else. The rules live in `server/src/domain/permission/ceiling.ts`.

The permission engine registers every stored permission as its own rule, with its fields, locales and conditions applying together. Holding `title` on `en` through one permission and `body` on `fr` through another does not give `title` on `fr`. The ceiling follows the same rule. A requested permission is split into atoms, one per combination of a value of every restricted property (`fields`, `locales`, ...) and a condition, and it is within the ceiling when:

- the user holds a permission with the same `action` and `subject` (a held permission with `fields: []` grants nothing and does not count; requesting `fields: []` is always allowed for the same reason);
- an empty list on a property other than `fields` (`locales: []`) grants no value of that property, so it adds no dimension and needs nothing to cover it, but the other properties and the conditions are still checked;
- a held permission is read the way the engine enforces it. On a localized subject a missing `locales` key is no locale, the same as `locales: []` (i18n's engine hook enforces `locale $in []`). For an admin token owned by a super admin, a missing key is every locale, because i18n does not restrict super admins;
- every atom is covered by a single held permission. A held permission covers a property value when it does not restrict the property (unset or `null`) or lists the value (a nested field is covered by its parent, `seo.title` by `seo`), and covers a condition when it is unconditional or lists it. A request that is unrestricted on a property or carries no condition only matches a held permission unrestricted on the same dimension, so omitting a restricted property, sending `null`, or dropping the conditions is rejected.

Different atoms may be covered by different held permissions, so unions on one dimension stay valid: `title` and `body` held separately allow `[title, body]`, `title@en` plus `title@fr` allow `title@[en, fr]`, and `title` under `is-creator` plus `title` under `has-same-role-as-creator` allow both conditions, because the engine ORs the two rules to the same effect. Mixing dimensions is not: `title@en` plus `body@fr` do not allow `title@fr`, and `title` unconditional plus `body` under `is-creator` do not allow `body` unconditional.

Where it applies:

- **Roles**: for every user except super admins. `PUT /admin/roles/:id/permissions` rejects permissions outside the requester's ceiling with a 403 listing them in `error.details.permissions`. A request made with an admin token is checked against the token's own permissions (`adminPermissions`) and, unless its owner is a super admin, against the owner's current permissions too: the token may hold less than its owner, and a token written before the owner lost a permission may hold more. A super-admin owner does not lift the token check. Permissions the role already carries are not checked, so a requester can keep or remove them but not change them. A permission counts as already carried regardless of the order of its fields, locales or conditions, since the engine applies them as sets; the role editor rebuilds those arrays in layout order on every save. A carried permission with no `locales` key on a localized subject is not resent as it is: i18n's `willValidateUpdatePermissions` hook gives it the default locale first, which widens it, so it is checked like a new permission and can be rejected although the user did not touch it. The role editor mirrors the rule in `admin/src/pages/Settings/pages/Roles/utils/createPermissionChecker.ts`: for each action it disables the values and conditions that cannot be added to what is already ticked, and a bulk tick picks one held combination rather than mixing several. Creating or duplicating a role goes through the same endpoint on a role that has no permissions yet, so nothing is exempt: the duplicate page drops the source permissions outside the user's ceiling before loading the form (`isPermissionWithinCeiling` in the same util) rather than sending them. A source permission the user holds only part of is dropped whole, not narrowed.
- **Admin tokens**: a token cannot carry more than its owner holds, by the same per-permission rule as roles. `enforceAdminPermissionsCeiling` in `server/src/services/api-token.ts` calls `getInheritedConditions` from `ceiling.ts` for every requested permission. Conditions are inherited from the owner, not chosen: none when unconditional owner permissions cover every field × locale combination, otherwise every owner condition under which every combination is covered. A request no single owner permission can cover (`title@fr` from `title@en` plus `body@fr`, or omitted `fields` against an owner restricted on them) is rejected with a 400. An omitted `locales` key on a localized subject is no locale, as the engine enforces it, so it needs nothing to cover it and is stored as sent. Super-admin owners are not limited. Token permissions are re-clamped when the server starts (`syncApiTokenPermissionsForAllUsers`, called from `server/src/bootstrap.ts`) and on the owner's every later role or user change (`reconcileTokenPermissionsToUserCeiling`, same function): a permission is deleted when no owner permission covers it any more, and its conditions are updated when the inherited set changed, with a warning in the server log for each. Tokens stored under the earlier union rule are corrected on the first start after the upgrade.
