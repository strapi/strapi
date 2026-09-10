# @strapi/plugin-spaces

Virtual multi-tenancy for Strapi: one deployment, many **workspaces**, sharing one database and one admin shell.

> **Workspaces v2** (multi-tenancy workshop, September 2026): the default workspace is "Strapi as it exists today" and sees everything; every user content type carries a workspace; entries can be shared; users belong to workspaces; shared settings are read-only outside default; the Content-Type Builder is read-only outside default; releases, content history and audit logs are workspace-aware. See [`docs/design.html`](docs/design.html) for the full design and the phasing.

## Quick start

1. Enable the plugin in your Strapi project:

   ```js
   // config/plugins.js
   module.exports = {
     spaces: {
       enabled: true,
       config: {
         maxSpaces: null, // instance-level cap; the licence option wins when set
         backfill: true, // attach rows that predate workspaces to the default workspace (once)
       },
     },
   };
   ```

2. Restart Strapi. Every `api::` content type gets a `space_id` column, rows that already existed are attached to the `default` workspace, and the `default` and `acme` workspaces are seeded.

3. Test isolation with the `X-Strapi-Space-Id` header (a workspace slug):

   ```bash
   # Create an article in acme
   curl -X POST http://localhost:1337/api/articles \
     -H "X-Strapi-Space-Id: acme" \
     -d '{"data":{"title":"Hello from acme"}}'

   # Visible in acme, and in default (which sees everything)
   curl -H "X-Strapi-Space-Id: acme" http://localhost:1337/api/articles
   curl -H "X-Strapi-Space-Id: default" http://localhost:1337/api/articles
   ```

## The model

| Rule                   | Behaviour                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default workspace      | Always present, undeletable. Sees every entry, user, content type and setting, unfiltered, with a "Workspace" column and filter in the Content Manager. Writes from default target a workspace (`space` in the body: a slug, an id or `null` = shared).                                                                                            |
| Scoping                | Every `api::` content type carries a `space_id`. A sub-workspace only sees its own rows and the shared ones (`space_id IS NULL`). Opt a type out with `pluginOptions.spaces.enabled: false`; opt a plugin type in with `scope: 'space'` (the Media Library models are).                                                                            |
| Legacy rows            | On the first boot rows without a workspace are attached to `default` (once, tracked in the plugin store). From then on `NULL` means **shared with every workspace**.                                                                                                                                                                               |
| Sharing                | Per content type in the CTB: **Share every entry with all workspaces** (`sharedEntries`, read-only outside default) and **Let other workspaces edit shared entries** (`sharedEditable`). Per entry from default: the "Workspace" side panel shares or moves an entry (`POST /spaces/move` with `targetSpaceSlug: null` shares).                    |
| Read-only affordance   | A sub-workspace sees a lock on shared entries: inputs disabled, write actions hidden, and the server refuses writes (403 with an explicit message).                                                                                                                                                                                                |
| Unique fields          | Validated within the workspace: the same `slug` can exist once per workspace; a shared entry counts everywhere.                                                                                                                                                                                                                                    |
| Content-Type Builder   | Browsable everywhere, editable from default only (403 on schema writes elsewhere; the builder says so).                                                                                                                                                                                                                                            |
| Users                  | Users belong to workspaces (many-to-many) on top of their roles' bindings; a platform-wide role means everywhere. A sub-workspace lists its members only, inviting from it binds the invitee, and inviting an **existing email adds that account** instead of failing. `/spaces/mine` is per user; the last-used workspace is remembered per user. |
| Settings               | Roles, API/transfer tokens, webhooks and locales created from default can be shared (no binding, or several) or exclusive; **shared items are read-only in sub-workspaces**, including role permissions, token regeneration and webhook triggering. "Set as default" for a locale stays per workspace.                                             |
| Releases               | Cross-workspace: each workspace sees its own entries in a release with its own readiness (`GET /spaces/releases/:id/status`); **only the default workspace publishes**. Scheduled publishes run unscoped.                                                                                                                                          |
| History and audit logs | Every history version and audit log records its workspace; a sub-workspace sees its own, default sees all with a "Workspace" column and filter.                                                                                                                                                                                                    |
| Licence                | `maxSpaces` (licence feature `multi-tenancy`, else the plugin config) caps the number of workspaces, archived included. Billing surfaces are visible from default only.                                                                                                                                                                            |
| Live preview           | The preview handler receives `params.plugins.spaces` (`{ slug, name, previewBaseUrl }`) so each workspace previews on its own origin.                                                                                                                                                                                                              |

### RBAC ceiling

Granting permissions is bounded by the caller's own (core, CMS-1718): a role cannot be given a permission its editor does not hold, and a user cannot be given such a role. The role editor shows those permissions disabled; the API refuses with `PermissionCeilingError` and the violations in `details`.

## Architecture

- **Reads** — a single DB-level net (`db-read-net.ts`) filters every `findOne`/`findMany`/`count` on a workspace-scoped model to the active workspace's rows plus the shared ones; the default workspace and headerless callers are unfiltered. User filters are ANDed underneath and can never widen the view.
- **Writes** — a document-service middleware (`document-service/multitenancy.ts`) decides the target workspace of every create, update, delete and publish, refuses what the caller may not edit (`services/access.ts` is the decision table), and runs the operation inside that scope (`utils/space-scope.ts`), so the entity validator's uniqueness query and relation resolution see the right rows. Raw `db.query` writes are caught by DB lifecycles (`lifecycles.ts`).
- **Settings** — the settings-visibility pattern (`settings-visibility/index.ts`): a hidden `spaces` relation on each resource, request wrappers that extract the binding from the body, read scoping outside default, and the shared-resource read-only rules.
- **Core seams used** — `registerRoleFormExtension`, `registerTokenFormExtension`, `registerUserFormExtension`, `registerMainNavAddon`, `registerSettingsMenuMutator`, `app.addRBACMiddleware`, the Content Manager hooks and APIs, the CTB `registerReadOnlyRule`, content-releases' `setActionScopeStrategy` and `registerReleaseDetailsExtension`, the audit logs column/filter registry, the preview `registerParamsProvider`.

See [`docs/design.html`](docs/design.html) §2 (Core concepts), §4 (Storage model), §5 (Request lifecycle) and §9 (Isolation guarantees).

## Tests

```bash
cd packages/plugins/spaces
yarn test:unit          # server
yarn test:front         # admin
PORT=1338 yarn test:api --no-generate-app tests/api/plugins/spaces   # from the repo root, after `yarn nx build @strapi/plugin-spaces`
```
