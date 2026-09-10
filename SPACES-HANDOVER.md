# Spaces Plugin — Handover

> **Status update (2026-07-30): the rebuild is complete.** Every file lost to the
> worktree corruption has been recreated, plus the i18n extension points they
> depended on. The plugin builds, lints, and its unit tests pass (37 spaces +
> 94 i18n server + 54 i18n front). The original rebuild guide below is kept for
> historical context; the "What needs REBUILDING" list is now DONE.

## What is this?

A **virtual multi-tenancy** plugin for Strapi 5 (`@strapi/plugin-spaces`). One deployment, one database, many **workspaces**. The default workspace is "Strapi as it exists today" and sees everything; sub-workspaces see their own entries, users and settings plus what is shared with them.

Design doc: `packages/plugins/spaces/docs/design.html`. Product decisions: the multi-tenancy workshop (Notion, 2026-09-07) and the plan in the session notes.

## Current state (Workspaces v2, 2026-09-09)

Everything below is implemented on `feature/spaces-multitenancy`, uncommitted, and verified (plugin unit + front tests, the six `tests/api/plugins/spaces` suites, the touched core packages' unit/front tests and type checks).

- **WS0 — RBAC ceiling (core, CMS-1718)**: an admin cannot grant, through a role or a role assignment, a permission they do not hold. Server: `PermissionCeilingError` (a `PolicyError`, so the violations reach the client) in `services/permission/ceiling.ts`, enforced in `assignPermissions({ ceilingUser })` and the CE/EE user controllers. Admin: the role editor renders out-of-reach permissions disabled with a tooltip (`conditionsPolicy="bounded"`), pre-existing out-of-scope permissions are preserved on save.
- **WS1 — Data model v2**: every `api::` content type carries `space_id` (opt-out `pluginOptions.spaces.enabled: false`); legacy rows are attached to default once (`backfill.ts`, plugin-store marker); NULL = shared. One DB read net (`db-read-net.ts`) is the read filter; the document-service middleware decides the target workspace of every write and runs it inside `runScoped()` (`utils/space-scope.ts`), which makes uniqueness per workspace. `services/access.ts` is the decision table. Moves accept `targetSpaceSlug: null` (share).
- **WS2 — Sharing surfaces**: `GET /spaces/entry-states`; admin RBAC middleware locks the edit view of read-only entries; header lock, "Workspace" side panel (share / move), list column and filter in default; CTB toggles `sharedEntries` / `sharedEditable`.
- **WS3 — CTB read-only outside default**: core seam `registerReadOnlyRule` (CTB `DataManager/readOnlyRules.ts`, also on `app.getPlugin('content-type-builder').apis`); server 403 on schema writes outside default.
- **WS4 — Users ↔ workspaces**: `spaces` M2M on `admin::user`; `services/membership.ts` (direct binding ∪ roles' bindings; platform-wide role = everywhere; super admins everywhere); member-only user lists with right totals; invite from a sub-workspace binds, an existing email is added (roles merged, `addedToWorkspace` in the response); membership guard on the header (403 for non-members); `/spaces/mine` per user; `GET|PUT /spaces/mine/current` remembered per user; core seam `registerUserFormExtension` + the invite modal skips the magic link for an added account.
- **WS5 — Shared settings read-only**: `decideWritableInSpace` (platform-wide or multi-bound = read-only outside default) for roles (incl. `/permissions`), API/transfer tokens (incl. `/regenerate`), webhooks (incl. `/trigger`), locales (except "set as default"); `?scope=all` is default-only; bindings are edited from default only; `data.workspaceAccess` on detail responses; `isReadOnly` on the role/token/locale form extensions; locked "Workspaces" card.
- **WS6 — Releases**: core `setActionScopeStrategy` + where-merge fix in content-releases, `registerReleaseDetailsExtension`; plugin stamps release actions with the entry's workspace, `GET /spaces/releases/:id/status`, per-workspace badges, publish is default-only (403 elsewhere).
- **WS7 — History and audit logs**: `space` on history versions (raw model patched in the models registry) and audit logs; own-or-shared / own-only nets; audit logs populate the workspace; core seam `registerAuditLogTableColumn` / `registerAuditLogFilter` (`@strapi/admin/strapi-admin/ee`).
- **WS8 — Limits**: plugin config (`maxSpaces`, `backfill`), `services/limits.ts` (licence feature `multi-tenancy` wins), `GET /spaces/limits` (default only), `SpaceLimitError`, admin surfaces disabled at the cap; billing/overview links hidden outside default; the settings landing page follows the first displayed link (core `Settings/Layout.tsx`).
- **WS9 — Live preview**: core `registerParamsProvider` on the CM preview config service (`params.plugins.<name>`); the plugin hands `{ slug, name, previewBaseUrl }`; `previewBaseUrl` on workspaces (settings edit page).
- **WS10**: persist tables (EE), docs (this file, the README, the design doc), tests per workstream.

### Browser coverage and the bugs it caught (2026-09-09)

`tests/e2e/tests/spaces/` holds the Playwright suite: `workspace-switcher`,
`content-isolation`, `shared-entries` and `settings-scope`. Run it with
`yarn test:e2e --domains spaces --project=chromium`.

Two conventions the specs depend on, both easy to get wrong:

- the active workspace is client state, so `pinWorkspace()` writes it **once**
  rather than through `addInitScript` (an init script re-runs on every
  navigation and would quietly undo a switch made through the UI);
- the DTS fixture predates the workspace permissions, so every spec calls
  `resyncSuperAdminPermissionsAfterImport()` — without it the restored super
  admin holds no `plugin::spaces.*` action and the settings entry and move
  action simply are not rendered.

Driving the admin in a browser turned up four defects, all fixed and covered:

1. **The "Workspace" column and filter never appeared.** `isWorkspaceColumnRelevant`
   matched the list route with `matchPath('/content-manager/…')` against
   `window.location.pathname`, which carries the admin basename
   (`/admin/content-manager/…`). Now matched with a basename-tolerant regexp.
2. **Creating a workspace dropped the admin on an error page.** The create page
   switched into the workspace it had just created, then returned to
   Settings → Workspaces — which is default-only and answers 404 everywhere
   else. It no longer switches; the switcher does that.
3. **Healing a stale workspace slug left the screen empty.** The requests made
   under the unknown header were _rejected_, and a rejected RTK query provides
   no tags, so invalidation could not revive it. The recovery path now resets
   the API state instead.
4. **A workspace filter followed the admin out of the default workspace.** The
   Content Manager persists list filters in the URL and in
   `STRAPI_LIST_VIEW_SETTINGS:<uid>`; the "Workspace" filter exists only in
   default, so one left behind emptied the list with no chip to remove it. A
   switch now strips it from both (`utils/workspaceFilters.ts`).

One regression in the read-only guard was found the same way: "Open in new tab"
was disabled on shared entries. It carried no action `type`, and the guard's
safe-list is keyed by type — a safe-list, not a deny-list, because the plugin
actions that _do_ write (i18n's "Delete entry (locale)") declare no type either.
Core now gives that action the `open-in-new-tab` type so a plugin can tell a
read-only action apart from a writing one without relying on a component name
the production bundle mangles.

### Permissions, sharing and cost (2026-09-09, second pass)

The suite grew to 37 specs across `permissions`, `sharing-lifecycle` and
`performance`, plus the API cases in `workspaces-v2` and `users-membership`
(63 API tests). What that second pass changed:

**A restricted admin could read every workspace (security).** Driving the admin
as a real second identity — the Editor role bound to Acme, not a super admin
swapping headers — showed the boundary was not there. `isMember` short-circuited
the default workspace to `true`, and the auth guard skipped requests that named
default or named nothing at all. Either was enough: `X-Strapi-Space-Id: default`,
or no header, and a workspace-restricted admin read every workspace's content.
Both are closed; membership is now checked for the default workspace like any
other, and a headerless admin request resolves to default and is checked there.

This is a **behaviour change, not only a fix**: an admin whose every role is
bound to a sub-workspace no longer sees the default workspace. That is the point
of the feature, but nobody should discover it as a regression.

**A user can end up in no workspace at all.** Archive the only workspace their
roles are bound to and they are a member of nothing: `/spaces/mine` answers `[]`
and every workspace-aware request is refused (403 for default, 400 for the
archived slug, which no longer exists as far as the resolver is concerned). The
account and its roles are intact, so it is recoverable by binding them
somewhere — and the switcher now says so instead of leaving a blank admin.
Covered in `users-membership.test.api.js`.

**Sharing is reversible from the UI.** The server already accepted un-sharing
(it is an ordinary move off `NULL`); only the affordance was missing, and the
picker hid the likely answer — `excludeSlug` had a parameter default of "the
workspace you are standing in", so passing `undefined` silently excluded
Default. The panel now has "Stop sharing…" next to "Share with every workspace".

**Workspace-awareness cost one HTTP request per row.** Every read-only
affordance — the header lock, the panel, the guard on each document and bulk
action, the RBAC middleware — asks the same question per document, and asked it
alone. `utils/entryStates.ts` is now the single asker: it collects the ids
requested within 10 ms and answers them in one `documentIds=a,b,c` call, caches
per **workspace** (the same entry is editable in one and read-only in another)
and notifies subscribers when a move or a share clears it. A ten-row list in a
sub-workspace went from ten requests to one; a workspace switch from 24 requests
and 10 entry-state calls to 14 and 1. `performance.spec.ts` holds that line:
one batched request in a sub-workspace, **none** in default, and no navigation
on a switch.

Two things that request cost teaches, both now in the code as comments:

- in the default workspace the list row already carries `space`, so the move
  action reads it there instead of asking — but only there. Outside default a
  non-null `space` does not mean writable: a shared content type's rows stay
  visible carrying whichever workspace stamped them, and only the entry state
  knows the difference;
- a cache clear bumps a revision rather than re-fetching from the listener. The
  listener closes over the arguments of the render that subscribed, and a clear
  usually accompanies a change to those arguments, so fetching from it asked
  about the state of affairs that had just ended.

**The stale-slug heal reloads the page, once.** Resetting the RTK cache while
the doomed requests are in flight does not reliably bring all of them back — a
query cancelled by the reset can be left with no subscriber and never asked
again, which shows as a blank page under a healed switcher (it was a reproducible
e2e flake). Healing a _stored_ slug now reloads, guarded so it happens at most
once and only when the new slug was actually written. An ordinary switch is
still a pure data swap, and a first visit with nothing stored does not come
through that path.

**`sharedEntries` is a boot-time flag.** The read net excludes shared content
types when the plugin registers, so ticking or unticking the flag changes
visibility on the next start — which is what happens in practice, since the
Content-Type Builder writes the schema and Strapi restarts. The API test flips
it through the CTB service and restarts, rather than mutating `pluginOptions` in
memory, which would prove nothing.

One test-infrastructure change rides along: `jest.config.api.js` ignores
`test-apps/e2e/`. A generated e2e app keeps real copies of the packages under
`.yalc`, which Jest's module map reads as a second `@strapi/core`, and the API
suites refuse to run at all while both exist. The API tests never load those
apps.

### Inheritance: overrides per workspace (2026-09-10)

An entry shared from the default workspace is read by every workspace — the same
row. A workspace that needs its own version **overrides** it: a copy of the
document under the **same documentId**, stamped with that workspace and marked
`space_override`. From then on that workspace reads its copy and everyone else
stays on the original; **reset** deletes the copy and puts the workspace back.

Why a row copy and not a stored diff: the copy is an ordinary entry, so filters,
sorting, search and pagination work on it natively. A diff has to be applied
after the query, which is where "sort by title" stops meaning anything — the
mistake to avoid at a million rows.

How the copy is made (`services/inheritance.ts`): `documents.clone()` inside a
scope that (a) marks everything it creates as an override and (b) hides the
original from reads that do not name it, then a raw rename of the clone's
generated documentId back to the original's — all in one transaction. The
hiding is what makes a unique field survive: the copy carries the original's
values, and the entity validator would refuse it otherwise. `clone` gives the
copy real components, dynamic zones and relations rather than shared rows.

Read rules (`db-read-net.ts`), now three scopes instead of two:

| scope                         | sees                                                    |
| ----------------------------- | ------------------------------------------------------- |
| unscoped (internal)           | everything, copies included                             |
| default / global / no request | every workspace's entries, **minus** copies             |
| workspace X                   | its own rows, plus inherited ones it has not overridden |

The exclusion is `documentId NOT IN (subquery)` where the subquery is a **knex
builder** passed to `$notIn` — it inlines, so it costs no round trip and does not
grow with the number of overrides.

Decisions worth knowing:

- **The default workspace lists the entry once.** A copy is the same document
  seen from elsewhere; showing it would put one document on screen once per
  workspace that overrode it, and would make an inherited entry's unique fields
  collide with its own copies.
- **Deleting a copy is refused** (`override-delete`) and points at Reset —
  deleting it would make the entry reappear, which is not what delete promises.
- **When the original stops being inherited** — moved into a workspace, or
  deleted — the copies are _promoted_ to ordinary entries of their workspace
  rather than cascaded away: they hold content somebody wrote. Moving the
  original into a workspace that holds a copy is refused, and says which.
- **Every unscoped "find the row for this documentId" had to learn this.** One
  documentId can name two rows now, so `resolvePlacement` (services/access.ts)
  decides which one the caller sees, and the history/audit/release stamping
  helper resolves it the same way. Getting this wrong is a coin flip, not a
  crash — which is why it is the part most worth reviewing.

Works on both kinds of sharing: an entry shared one at a time from the default
workspace, and a content type whose entries are _all_ shared (`sharedEntries`) —
which is the case an admin reaches by ticking "Share every entry with all
workspaces" and then wanting one entry to differ in one workspace. On such a
type nothing is stamped with a workspace, so "inherited" means every row that is
not somebody's copy, and the read net covers those content types for the
exclusion alone. Not supported: `sharedEditable` types, where there is nothing
to override because every workspace can already edit the entry.

Endpoints: `POST /spaces/inheritance/override`, `POST /spaces/inheritance/reset`,
`GET /spaces/inheritance?contentType=&documentIds=` (batched, one request per
page, default workspace only).

**One reload, on purpose.** Whether the edit form is editable is decided by the
RBAC middleware, and `useRBAC` re-checks only when the _list of permissions being
asked about_ changes — never when the answer would. So taking or dropping a copy
reloads the edit view; otherwise the inputs keep the lock they were rendered
with and lie about what the workspace may do.

### Where an admin lands when they sign in (2026-09-10)

The workspace an admin was last in is remembered server-side, and four defects
stood between that and it working. All four are the same shape — state that
outlives a session:

1. **The stored slug had no owner.** Two admins sharing a browser inherited each
   other's workspace. It is now stored with the admin's id and ignored when it
   belongs to someone else.
2. **Hydration ran before the answer arrived.** The remembered workspace was
   asked for and then not waited for, so a fresh browser landed on the first
   workspace in the list instead.
3. **The answer was cached across logins.** The admin is one page load from
   login to logout to the next login, so RTK served the previous session's
   answer with no request on the wire. The endpoint now keeps nothing once
   hydration stops asking (`keepUnusedDataFor: 0`).
4. **The switcher hydrated on the login screen.** The workspace list survives a
   logout in the cache, so the switcher picked a workspace for nobody and stored
   it — which the next admin then inherited. It now requires a session, except
   when the stored workspace is dead, because that is exactly when no session
   can be proven and healing matters most.

Hydration is also once per session now: switching invalidates the caches, which
refetches the workspace list, which used to re-trigger the effect that had just
switched.

Known flake, not fixed: `recovers when the stored workspace no longer exists`
passes or fails depending on the run. The admin around a dead workspace header
re-renders hard while every request is refused, and the switcher's recovery
races that. The recovery itself works (the reload lands on a healed slug); it is
the timing that is unreliable, on a path an admin reaches only when a workspace
is deleted or archived under them.

### Scale: measured at a million documents (2026-09-10)

Full numbers in the benchmark notes; the short version:

- `space_id` **is** indexed (the FK index the schema builder creates) and the
  planner does use it: `space_id = X OR space_id IS NULL` becomes a multi-index
  OR. Scoped reads are _faster_ than the default workspace's unfiltered ones
  (search: 100 ms vs 168 ms; list page: 81 ms vs 116 ms).
- What costs is `ORDER BY` over that OR-union — a temp b-tree over half a
  million rows for ten rows of output. No index fixes it, because two values
  cannot come back already ordered from one index. Measured against a
  single-value predicate: 81 ms → **0 ms**.
- Every list-shaped composite tested (`space_id, published_at, locale`) made the
  count 4.5× faster and the Content Manager's default sort 4.8× slower, so
  **none is declared**. The one index the plugin does add is
  `(space_id, document_id)`, which the inheritance exclusion needs and which
  never talked the planner out of a better plan.
- The read filter was expressed as a relation (`{ space: { id } }`), which the
  query builder turned into a LEFT JOIN of the `spaces` table **per `$or`
  branch** plus `SELECT DISTINCT`. Filtering on the join column directly is
  7-9% faster on every scoped read and emits no join at all.

`space_id IN (X, NULL)` is **not** the same predicate — SQL `IN` never matches
NULL. The `$or` form is load-bearing.

Numbers are SQLite (Docker was unavailable for a Postgres run), so they are
directional for a planner as weak as SQLite's; the index conclusions in
particular deserve re-checking on Postgres.

Not exercised in the browser: releases, audit logs, content history and review
workflows. The generated e2e app boots Community edition, where those routes
answer 405. They are covered by the API suites only.

Not done (deferred by the workshop): per-workspace SSO, per-workspace AI key / MCP configuration, pricing. Not done (technical): a Media Library "share" action (legacy assets stamped default are shared through the move endpoint), GraphQL coverage, nested-populate leaks through inverse relations (needs a generic query-filter hook), per-request CSP for preview origins.

## Architecture summary

```
Admin: SpaceSwitcher (localStorage slug, hydrated from GET /spaces/mine/current) → window.fetch interceptor adds X-Strapi-Space-Id
Request → resolve-space (bootstrap-registered): ctx.state.spaceId / spaceSlug (400 on unknown/archived)
        → auth wrappers: bound API tokens; membership guard (403 for non-members, self-service routes exempt)
        → Koa integrations: default-only rules (CTB writes, release publish, workspace management),
          content-type visibility, roles/users/tokens/webhooks/locales scoping + read-only rules
        → document-service middleware: target workspace of every write, refusals (403/404), runScoped()
        → DB read net (THE read filter: own rows + shared for a sub-workspace; default/headerless unfiltered)
        → DB lifecycles: stamp on create, refuse raw single-row writes a sub-workspace may not do
```

**Scoping**: every `api::` type by default; `pluginOptions.spaces.enabled: false` / `scope: 'none'` opts out, `scope: 'space'` opts a plugin type in. **Visibility**: `pluginOptions.spaces.visibleIn` (empty = everywhere). **Sharing**: `sharedEntries` / `sharedEditable`, or per entry (`space_id NULL`).

## Key design decisions

1. **NULL means shared, after a one-time backfill** — idempotency is a plugin-store marker, never `IS NULL`.
2. **One read filter** (DB net), never `params.filters` injection: user filters are ANDed and cannot widen the view; default and headerless callers are unfiltered.
3. **Writes run inside a workspace scope** (`AsyncLocalStorage`): the validator's uniqueness query and relation resolution see the right rows; `runUnscoped()` for internal enumerations.
4. **Refusals are `PolicyError`s** (`WorkspaceAccessError`, `PermissionCeilingError`, `SpaceLimitError`): the endpoint composer masks other `ForbiddenError`s into a bare 403.
5. **Core is touched only through generic seams or genuine bug fixes** — every seam is listed in the README.
6. Empty binding = platform-wide (settings resources), and platform-wide or multi-bound = read-only outside default.

## Next slices

- Media Library "share" action; GraphQL coverage; a generic query-filter hook for nested populates.
- Per-workspace SSO, AI key / MCP configuration, pricing (product decisions pending).
- Partial release publishing (core, separate track); per-request CSP for preview origins.
- Commit the branch (nothing is committed yet) and open the core PRs (WS0 first, then the seams).
