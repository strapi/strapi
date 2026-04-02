# RFC: Content API — “Read drafts” permission (non-breaking default)

## Goal

Introduce an explicit **authorization** control for reading **draft** publication data via the **Content API** (REST, GraphQL, document-backed flows), without changing today’s default behavior for existing projects.

**Default:** permission is **on** (allowed) everywhere it matters, so **no breaking change** for apps that already rely on `status=draft`, `publicationFilter`, or implicit draft defaults.

---

## Problem statement

Today, Content API RBAC is **per controller action** (`find`, `findOne`, `create`, …). If a role or API token may call `find` / `findOne`, it may also pass **`status=draft`**, **`publicationFilter`**, **`hasPublishedVersion`**, etc. — there is **no separate bit** for “may read draft rows vs published-only.”

That gap **predates** `publicationFilter`; this RFC addresses it in a controlled way.

---

## Design principles

1. **Non-breaking:** Existing databases and roles keep **effective** “can read drafts” = **true** unless operators explicitly revoke it.
2. **Per content-type (UID)** for D&P types only; no extra noise for types without draft & publish.
3. **Single enforcement choke point** in the Content API query pipeline (validate/sanitize), reused by REST and GraphQL.
4. **Align Users & Permissions and API tokens** with the same underlying `ability` checks.

---

## Permission model

### Recommended: synthetic Content API actions (per D&P UID)

Register **one extra action per** draft-and-publish content type, e.g.:

- `api::<apiName>.<controllerName>.readDraft`

Where `<controllerName>` matches the existing controller used for `find` (typically the collection / single type name Strapi already uses for `api::…​.find`).

**Semantics:**

- **`find` / `findOne` unchanged** — still gate “may hit the route / call the document service for this type.”
- **`readDraft`** — “may request query parameters that resolve to **draft** rows for this UID.”

If the principal lacks `readDraft` but has `find`:

- Enforce **published-only** behavior (see [Enforcement](#enforcement)) — do **not** remove `find` entirely.

**Why synthetic actions**

- Fits the existing **CASL `ability.can(action)`** model (`users-permissions` + API tokens already map DB rows → `{ action }` → `generateAbility`).
- Keeps **per-type** control (unlike one global toggle).

**Sync / lifecycle (critical)**

`users-permissions` `syncPermissions()` today builds `allActions` from **controller method names** and **deletes** permission rows whose `action` is not in that set. Synthetic actions **must**:

1. Be **registered** in the Content API action provider during bootstrap (same registry used for `validate.permission` warnings).
2. Be **included** in the **allowed action list** used by `syncPermissions` so rows are not deleted — e.g. extend the generator that produces `allActions` to **merge** `getDraftReadActions(strapi)` for every D&P content type.

Without (2), DB rows for `readDraft` would be removed on the next sync.

### Alternative (heavier schema change)

Add a column on `plugin::users-permissions.permission` (e.g. JSON `metadata`) — more flexible but more migration + admin UI work. Only consider if you need finer than one boolean per UID.

---

## Default “on” (non-breaking) strategy

1. **Database migration (upgrade path)**  
   For **each role**, for **each D&P content-type UID** that already has **`find`** (or **`findOne`** for single types — align with how you scope read):

   - Ensure a **`readDraft`** permission row exists and is **enabled** (same as today’s implied behavior).

   Roles that **never** had `find` should **not** gain `readDraft` in a way that expands access; typically **mirror**: `readDraft` granted iff `find` was granted (product decision — document explicitly).

2. **Runtime fallback (safety net)**  
   During a transition window (optional), if **`readDraft` row is missing** for a `(role, uid)` pair, treat as **allowed** if `find` is allowed — avoids edge cases in partially migrated DBs. Remove once migrations are trusted.

3. **New installs**  
   Bootstrap / seed: default roles (Public / Authenticated) get the same **default matrix** you choose (often: Public = published-only by revoking `readDraft` for public role — **product decision**).

---

## Enforcement

### Where

Implement in the **Content API query pipeline**, after parsing/validation of known keys, with access to:

- `auth` (`ability`, credentials),
- content-type **schema** (UID, `draftAndPublish`).

Best fit: **`strapi.contentAPI.validate.query`** and/or **`sanitize.query`** in `@strapi/utils` (or a dedicated helper called from both), using existing `Options.auth` and `route` / `strictParams`.

Do **not** add a second route middleware scope for `readDraft` unless you also change every route config — **avoid** duplicating `verify` logic.

### What counts as “reading drafts”

Central helper, e.g. `queryRequiresDraftReadPermission(query, contentType): boolean`, true when **any** of:

| Input                 | Notes                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status=draft`        | Explicit draft slice                                                                                                                              |
| `status` omitted      | Document service default is often **draft** — **must** match current REST/core defaults in code paths you protect                                 |
| `publicationFilter`   | Any mode that, with the resolved `status`, selects **draft physical rows** (pair-scoped, document-scoped, `modified`/`unmodified` on draft, etc.) |
| `hasPublishedVersion` | Legacy mapping → document-scoped modes that target draft rows                                                                                     |

**Edge cases to specify in implementation:**

- **`status=published`** with filters that only touch published rows — typically **no** `readDraft` required.
- **Mixed / degenerate** combinations — align with document service resolution order (same as `publicationFilter` RFC).

### Behavior when forbidden

Choose one (document in RFC + user docs):

- **A (strict):** `403 Forbidden` with a stable error code/message.
- **B (soft):** coerce query to **published-only** (`status=published`, strip/override draft-only `publicationFilter`) — can surprise API consumers; prefer **A** unless you explicitly want SEO-safe public APIs.

### GraphQL

GraphQL resolvers already call `strapi.contentAPI.validate.query` / `sanitize.query` with `auth`. **Reuse the same helper** — no separate GraphQL-only matrix.

### API tokens

| Token type      | Suggested rule                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| **Full access** | Implies all `readDraft` actions (or bypass check — align with `find` semantics).                                |
| **Read-only**   | Must include `readDraft` in effective permissions if draft reads are allowed; otherwise enforce published-only. |
| **Custom**      | Expose `readDraft` actions in the same picker as `find` / `findOne` for each D&P UID.                           |

---

## Code areas to touch (checklist)

### Core

- [ ] Register synthetic `readDraft` actions in Content API permissions (`registerActions` + D&P discovery).
- [ ] Extend `syncPermissions` **allActions** list (users-permissions) so `readDraft` rows are not deleted.
- [ ] Implement `queryRequiresDraftReadPermission` + enforcement in `validate.query` / `sanitize.query` (or shared module used by both).
- [ ] Unit tests: matrix of `status` / `publicationFilter` / defaults × allowed/denied.
- [ ] Config flag (optional): `api.rest.enforceReadDraftPermission` default `true` after migration — only if you need a kill switch.

### Users & Permissions plugin

- [ ] DB migration: seed `readDraft` permissions **on** for existing roles that had `find` (per UID).
- [ ] Admin UI: show **Read drafts** (or similar) next to **Find** for D&P types only.
- [ ] `toContentAPIPermission` / role bootstrap: unchanged shape `{ action }` — new rows use new action strings.

### Admin / API tokens

- [ ] Include new actions in valid permission list for **custom** tokens (`api-token` service + admin UI).
- [ ] Document behavior for **read-only** vs **full-access** tokens.

### GraphQL plugin

- [ ] No duplicate RBAC if validate/sanitize already run — **verify** association resolvers and custom resolvers still pass through the same pipeline.

### OpenAPI / docs

- [ ] Regenerate or document that draft access may require extra permission (if you expose action names in docs).

### Tests

- [ ] API tests: JWT user with `find` but without `readDraft` → `403` or published-only (per chosen behavior).
- [ ] Regression: default role after migration still reads drafts as today.
- [ ] GraphQL parity tests.

---

## Rollout & compatibility

| Concern              | Mitigation                                                                       |
| -------------------- | -------------------------------------------------------------------------------- |
| Existing projects    | Migration grants `readDraft` where `find` exists; optional runtime fallback.     |
| Headless public site | Operators can **revoke** `readDraft` on Public role for specific types.          |
| Performance          | Single `ability.can` per request + cheap predicate on query object — negligible. |

---

## Out of scope (for this RFC)

- Admin panel permissions (different model).
- Field-level draft visibility.
- Write/publish/delete — separate actions already exist (`update`, `publish`, …).

---

## Open questions

1. **Exact action naming** — must be stable and unique per UID; align with existing `api::x.y.z` pattern.
2. **Single-type** `find` vs `findOne` naming in your codebase — mirror the same controller actions used for scopes.
3. **Public role default after migration** — keep parity with today (often public **can** read drafts if they could before) vs tighten defaults for **new** projects only.
4. **403 vs coerce** — product preference.

---

## Summary

Adding **read drafts** as a **separate Content API permission** (synthetic `readDraft` actions per D&P UID), **defaulting to allowed** via migration + optional fallback, with enforcement centralized in **validate/sanitize query**, aligns with Strapi’s existing **ability** model, avoids breaking existing apps, and pairs naturally with the newer **`publicationFilter`** surface without conflating query syntax with authorization.
