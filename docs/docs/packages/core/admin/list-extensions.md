---
title: Settings list columns and filters
description: 'The hooks a plugin registers to add columns and filters to the API tokens, roles, users and audit logs lists.'
status: draft
review_notes:
  - New hooks, written with the code; needs a maintainer review.
tags:
  - frontend
  - public-api
---

Plugins add columns and filters to four Settings lists, `api-tokens`, `roles`, `users` and `audit-logs`, with two waterfall hooks. They work like the Content Manager list view hooks `Admin/CM/pages/ListView/inject-column-in-table` and `Admin/CM/pages/ListView/inject-in-filters`. The lists run them with [`useSettingsListExtensions`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/hooks/useSettingsListExtensions.ts). With no handler, the lists are unchanged.

Both hooks are experimental, hence the `unstable_` prefix on their names and on the exported types (`unstable_InjectSettingsListColumnsArgs`, `unstable_InjectSettingsListFiltersArgs`, `unstable_InjectableSettingsListHeader`, `unstable_InjectableSettingsListFilter`). They can change in a minor release.

## Columns

`Admin/Settings/pages/ListPage/unstable_inject-column-in-table` gets `{ list, displayedHeaders }` and returns it. A plugin adds, moves or removes headers. A header it adds renders its cell with `cellFormatter`.

```tsx
app.registerHook(
  'Admin/Settings/pages/ListPage/unstable_inject-column-in-table',
  ({ list, displayedHeaders }: InjectSettingsListColumnsArgs) => {
    if (list !== 'users') {
      return { list, displayedHeaders };
    }

    const index = displayedHeaders.findIndex(({ name }) => name === 'email');
    const team = {
      name: 'plugin::my-plugin.team',
      label: { id: 'my-plugin.users.team', defaultMessage: 'Team' },
      cellFormatter: (user) => <TeamChip user={user} />,
    };

    return {
      list,
      displayedHeaders: [
        ...displayedHeaders.slice(0, index + 1),
        team,
        ...displayedHeaders.slice(index + 1),
      ],
    };
  }
);
```

- `list` types the rows: after `list === 'users'`, `cellFormatter` gets a user.
- Name plugin headers `plugin::<pluginId>.<name>`: a header named like a core column renders the core cell.
- `label` is a string or a message descriptor. Plugin headers are never sortable: the server sorts on its own fields only.
- The core headers, in order: `api-tokens` `name`, `description`, `createdAt`, `lastUsedAt`; `audit-logs` `action`, `date`, `user`; `roles` `name`, `description`, `usersCount`; `users` `firstname`, `lastname`, `email`, `roles`, `username`, `isActive`.

## Filters

`Admin/Settings/pages/ListPage/unstable_inject-in-filters` gets `{ list, displayedFilters }` and returns it, as `Admin/CM/pages/ListView/inject-in-filters` does. The filters join the list's filter bar. API tokens and roles have no core filters, so they show the bar only when a handler adds one.

```ts
app.registerHook(
  'Admin/Settings/pages/ListPage/unstable_inject-in-filters',
  ({ list, displayedFilters }: InjectSettingsListFiltersArgs) => ({
    list,
    displayedFilters: [
      ...displayedFilters,
      {
        name: 'plugin::my-plugin.team',
        label: { id: 'my-plugin.team', defaultMessage: 'Team' },
        type: 'enumeration',
        options: teams.map(({ slug, name }) => ({ label: name, value: slug })),
        formatValue: (slug) => teams.find((team) => team.slug === slug)?.name ?? slug,
      },
    ],
  })
);
```

- A filter on a field of the core model keeps its name and is sent in `filters`, as in the Content Manager.
- A filter the core model does not have is named `plugin::<pluginId>.<name>`. The list takes it out of `filters`, which the server validates against the core model, and sends it as `plugins[<pluginId>][$and]` with the plugin's own name: `plugins[my-plugin][$and][0][team][$eq]=blue`. The plugin applies it on the server, for example with a route middleware. The four list routes and the audit logs export drop `plugins` before they query the database.
- Only top-level `$and` entries are moved: a plugin filter nested in `$or`, in a hand-written URL, reaches the server in `filters` and is refused.
- Give an `enumeration` filter its `options` as `{ label, value }` objects: the value input of the popover cannot render plain strings. Give `formatValue` so the tag shows the label instead of the value.
- The audit logs export sends the plugin filters too, but its continuation token and its audit event only cover `filters`. A plugin enforces its own scope on the server and never trusts `plugins`. The API tokens page keeps the filters of the URL when it sets its default sort, and shows the empty table instead of the "Add your first API Token" invitation when a plugin filter matches no token.

## Related

- [Filters](./filters.md): the core filter bar, stored under `filters` in the URL.
- [`@strapi/admin`](./index.md): `StrapiApp`, `registerHook` and the other registration APIs.
