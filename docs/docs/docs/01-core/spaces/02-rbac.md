---
title: Permissions and membership
tags:
  - spaces
  - multi-tenancy
  - rbac
---

# Permissions and membership

Two questions have to be answered before anyone touches content:

- **May this person enter this space?** — membership answers that.
- **What may they do once they are in it?** — Strapi's existing roles answer that.

Both must pass. Membership is not a permission system of its own, and it does
not replace one: the permission engine, its conditions, its field and locale
properties and its UI all stay exactly as they are.

## Membership

```
admin user → space membership → roles held in that space
```

A membership with **no roles** leaves the user with the roles they hold
platform-wide. That is the common setup, and it behaves exactly like Strapi
without Spaces: one role, applied everywhere the user can go.

A membership **with roles** overrides them, for that space only. That is what
lets someone be an editor for one brand and a publisher for another without two
accounts.

## Scoping roles rather than filtering the ability

Strapi builds a user's ability from the permissions of every role they hold.
Left alone, someone who is a publisher in Germany would carry publishing rights
into France: the permission check would pass, and only the row filter would stop
them — for the operations the row filter covers.

The fix is upstream of the ability. `@strapi/admin` exposes:

```ts
permission.setUserRolesScope(async (user) => {
  // role ids that apply right now, or null to keep every role the user holds
});
```

`findUserPermissions` consults it before loading anything, so the ability is
built from the right roles in the first place, rather than being built wrongly
and then filtered.

This runs while the ability is still being built, which is **before**
authentication has put the user on the request — hence the user being passed in
rather than read from `ctx.state`. The resolved space is memoised on the
request, so settling it again afterwards costs nothing.

Outside a space — the all-spaces view, a job, the CLI — every role applies.
Which rows the holder then reaches is the query scope's business, not the
ability's.

## Who administers what

Spaces adds four actions:

| Action                             | What it allows                           |
| ---------------------------------- | ---------------------------------------- |
| `plugin::spaces.spaces.read`       | See the list of spaces, and the switcher |
| `plugin::spaces.spaces.manage`     | Create, rename and archive spaces        |
| `plugin::spaces.members.manage`    | Add and remove members, set their roles  |
| `plugin::spaces.spaces.access-all` | Work across every space at once          |

`access-all` is a permission, not a consequence of being called a super admin —
though the super admin holds every permission and therefore holds this one too.
Super admin is not an implicit bypass anywhere in Strapi's RBAC: it is a role
that owns a permission row for every registered action. Spaces does not change
that.

Two things are deliberately kept apart:

- **The default space** — where you land when you do not ask for one.
- **The all-spaces view** — seeing every tenant at once.

Landing somewhere must not imply authority over everywhere, so selecting a space
never grants cross-space access, and the all-spaces view is never the default:
a caller with `access-all` still lands in the default space, and has to ask for
`*`.

## Tokens

An API token is a standing grant, so the space it works in is decided when it is
issued — a token cannot be trusted to say honestly which tenant it is calling on
behalf of. The binding is recorded in the plugin's own table rather than as a
column on the token, because tokens are looked up while a request's space is
still being worked out, and a space-scoped read at that point would have nothing
to filter by.

A token created outside any space is unbound and keeps working across every
space, which is what an existing project's tokens keep doing after Spaces is
switched on.
