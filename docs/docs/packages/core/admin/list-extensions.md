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

Both hooks are experimental, hence the `unstable_` prefix on their names and on the exported types (`unstable_InjectSettingsListColumnsArgs`, `unstable_InjectSettingsListFiltersArgs`, `unstable_InjectableSettingsListHeader`, `unstable_InjectableSettingsListFilter`, `unstable_InjectableSettingsListToolbarFilter`, `unstable_SettingsListToolbarFilterProps`), and on `unstable_SettingsListToolbarSelect`. They can change in a minor release.

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
      name: 'my-plugin.team',
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
- Give plugin headers a name no core column uses, for example prefixed with the plugin id: a header named like a core column renders the core cell.
- `label` is a string or a message descriptor. Plugin headers are never sortable: the server sorts on its own fields only.
- The hook returns the whole header list, like the Content Manager hook: a handler that drops core headers removes those columns. Keep the core headers and add yours.
- The core headers, in order: `api-tokens` `name`, `description`, `createdAt`, `lastUsedAt`; `audit-logs` `action`, `date`, `user`; `roles` `name`, `description`, `usersCount`; `users` `firstname`, `lastname`, `email`, `roles`, `username`, `isActive`.

## Filters

`Admin/Settings/pages/ListPage/unstable_inject-in-filters` gets `{ list, displayedFilters }` and returns it, as `Admin/CM/pages/ListView/inject-in-filters` does. A filter takes one of two shapes.

A filter on a field of the core model joins the list's Filters popover and is sent in `filters`, as in the Content Manager. This works on `users`, `roles` and `audit-logs`. On `roles` the popover only shows once a plugin adds a filter, and its filters apply together with the search. `api-tokens` has no popover: its route lists every token and reads no query, so the page ignores filters of this shape.

A filter the core model does not have, such as a space, uses `placement: 'toolbar'`. It renders on the right of the toolbar, like the Content Manager locale picker. The plugin gives a `Component`: core passes it `value` and `onChange` and keeps the URL in sync, and the component loads its own options with hooks, usually rendering `unstable_SettingsListToolbarSelect`:

```tsx
import { unstable_SettingsListToolbarSelect as SettingsListToolbarSelect } from '@strapi/admin/strapi-admin';
import type { unstable_SettingsListToolbarFilterProps as ToolbarFilterProps } from '@strapi/admin/strapi-admin';

const TeamFilter = (props: ToolbarFilterProps) => {
  const { data: teams, isLoading } = useGetTeamsQuery();

  return (
    <SettingsListToolbarSelect
      {...props}
      label={{ id: 'my-plugin.team', defaultMessage: 'Team' }}
      placeholder={{ id: 'my-plugin.team.all', defaultMessage: 'All teams' }}
      options={(teams ?? []).map(({ slug, name }) => ({ label: name, value: slug }))}
      isLoading={isLoading}
    />
  );
};

app.registerHook(
  'Admin/Settings/pages/ListPage/unstable_inject-in-filters',
  ({ list, displayedFilters }: InjectSettingsListFiltersArgs) => ({
    list,
    displayedFilters: [
      ...displayedFilters,
      { placement: 'toolbar', pluginId: 'my-plugin', name: 'team', Component: TeamFilter },
    ],
  })
);
```

- The value goes to the URL and the list request as `plugins[<pluginId>][<name>]`, for example `plugins[my-plugin][team]=blue`, apart from `filters`, which the server validates against the core model.
- The hook is experimental: the shape of a toolbar filter can change in a minor release.
- `unstable_SettingsListToolbarSelect` keeps a value from the URL while `isLoading` is true, and clears it once the options are loaded if no option has it (for example from an old link). Pass `isLoading` while the options load, or a value from the URL is cleared before they arrive.
- `placeholder` is the option that clears the filter. Picking an option brings a paginated list back to its first page.
- The plugin applies the value on the server. A middleware on the list route reads `plugins[<pluginId>]` and keeps it for the request, and a scope registered with `strapi.db.unstable_scopes` turns it into a `where` condition. Read [Query scopes](../database/05-query-scopes.md). The four list routes and the audit logs export drop `plugins` before they query the database.
- Attach the middleware to the routes (for example in their `config.middlewares`) rather than comparing `ctx.path`: the Users and Roles pages request `/admin/users/` and `/admin/roles/`, with a trailing slash.
- The options of the audit logs "User" filter come from `GET /admin/audit-logs/users`, which reads the authors' ids with a raw query on the join table. A scope on `admin::audit-log` does not narrow that list; a scope on `admin::user` narrows the users it then loads.
- The audit logs export streams its rows after the controller returned. It reads them in the request's async context, so a scope that reads an `AsyncLocalStorage` store or `strapi.requestContext` applies to the export as it does to the list.
- The audit logs export sends `plugins` too, but its continuation token and its audit event only cover `filters`. A plugin enforces its own scope on the server and never trusts `plugins`.
- The lists only send the values of registered dropdowns: a link with a `plugins` value no dropdown reads does not filter anything.
- The API tokens page keeps `plugins` when it sets its default sort. When a plugin filter matches no token, it says so and offers to clear the filters, instead of inviting to create the first token.

## Related

- [Filters](./filters.md): the core filter bar, stored under `filters` in the URL.
- [`@strapi/admin`](./index.md): `StrapiApp`, `registerHook` and the other registration APIs.
