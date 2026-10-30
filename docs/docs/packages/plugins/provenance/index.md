---
title: '@strapi/plugin-provenance'
sidebar_label: 'provenance'
description: 'Records, field by field, whether content was written by an AI, a human or an integration, and who reviewed it.'
package: '@strapi/plugin-provenance'
status: draft
review_notes:
  - Hardened after an adversarial test round (permissions, clone, publish guard before publishing, GraphQL). Component reads are the known cost.
  - The agent identity and the approval contract target the Agent Governance RFC, which is a draft. Check them again when the RFC settles the identity model and how a queued write surfaces.
  - MVP from the field provenance design. Media is not covered yet, and components and dynamic zones are tracked as one field each.
tags:
  - backend
  - frontend
---

## Purpose

`@strapi/plugin-provenance` keeps, for each top-level field of an entry, who wrote its current value and whether a human reviewed it. It answers three questions: was this field written by an AI, a human or an integration? Did someone review it, and which version? Is the reviewed value still the one that will be published?

The plugin attests the channel a value came through. It does not detect AI text.

It is the field-level layer of Agent Governance, an Enterprise feature. Agent Governance gives agents an identity, roles, an audit trail and an approval queue, and owns all of that. This plugin reads the identity and adds two things the queue cannot do alone: it ties an approval to the exact values the reviewer saw, and it stops a person from publishing an agent's draft without a review.

### What this does not guarantee

- **`human-entered` means an admin session.** A person may have pasted the text from an AI assistant and answered "Other source", or not been asked at all. This is why the source has no IPTC term.
- **Only declared AI is covered.** An agent on a token nobody qualified reads as `unattributed`, and the publish guard lets it through. "No declared AI content" does not mean there is no AI content.
- **Reviews state what a person confirmed.** They do not prove the person read the text.
- **The export is a record, not a proof.** It is not signed, and anyone with database access can rewrite provenance rows.

## Key concepts

### Two axes: source and review

The source of a field is one of:

| Source          | Meaning                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `ai-generated`  | Written by an AI                                                        |
| `ai-assisted`   | AI output edited by a human, or an AI rewrite declared as an edit       |
| `human-entered` | Entered by an admin user in a session. Entered, not necessarily written |
| `automated`     | Written with an API token qualified as a classic integration            |
| `unattributed`  | No reliable signal. This is the default, never `human-entered`          |

The review is separate. A review stores the reviewer and the hash of the value they saw. When the value changes, the review stops counting.

### Signals

[`server/src/domain/declaration.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/server/src/domain/declaration.ts) turns the request into a declaration, strongest signal first:

1. **Agent identity**: the request comes from an agent known to the server (see [Agent identity](#agent-identity)). It is an AI write, and the agent's name comes from the server.
2. **Strapi channel**: requests from the Strapi MCP server (`ctx.state.auditSource === 'mcp'`) are AI writes.
3. **Token profile**: an admin qualifies each Content API token as `agent`, `integration` or `mixed` in Settings > Provenance. Tokens without a profile are unspecified. Admin tokens have no profile: agents replace them.
4. **Client claim**: the `Strapi-Provenance` header (`source=ai; model="…"; agent="…"`) applies to the whole request. On content API routes, a `provenance` body key next to `data` applies per field and wins over the header.
5. **Admin session**: an admin user entered the value.

A client claim can only declare AI or add details. It never turns a write into `human-entered` or `automated`, so an agent token sending `source=human` stays AI. It cannot replace the name of an agent known to the server, only add the model.

### Agent identity

`resolveAgentPrincipal` in [`server/src/services/request.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/server/src/services/request.ts) is the only place that knows how an agent shows up. It recognizes the agent auth strategy with an admin user of kind `agent` (option B of the Agent Governance RFC) and `ctx.state.agent`, set by the gateway of the [plugin prototype](https://github.com/strapi/strapi-enterprise/pull/29). Another identity model changes this one function. Rows store the actor as `{ type: 'agent', id }`.

### Approvals

An approval queue is optional for this plugin, and this plugin is optional for the queue: `strapi.plugin('provenance')?.service('approvals')`. The queue owns its table, routes, permissions and interface. [`server/src/services/approvals.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/server/src/services/approvals.ts) gives it two functions:

- `getReviewState({ uid, documentId, locale })`: per field, the source, agent, review and `hash` of the draft value, plus `toReview`, the AI fields that block publishing. A card must show those even when they did not change, otherwise approving the publish fails on the guard.
- `executeApproved({ uid, documentId, locale, action, agent, decidedBy, hashes, claim, pendingActionId }, run)`: runs the approved action in one transaction, under the document lock.

```ts
const state = await approvals.getReviewState({ uid, documentId });
// Show the diff and `state.toReview`, keep the hashes of what was shown, then on approval:
await approvals.executeApproved(
  { uid, documentId, action: 'publish', agent, decidedBy: reviewer.id, hashes },
  () => strapi.documents(uid).publish({ documentId })
);
```

`executeApproved` does three things the prototype's `approve` needs:

- **It compares `hashes` with the draft.** The agent can keep editing after the reviewer opened the diff. A difference throws `StaleApprovalError` (`details.fields`), which the queue should answer with `409`.
- **It attributes writes inside `run` to the agent.** An approval runs in the reviewer's request: without this, the agent's queued edit would be recorded as `human-entered`. `withExecution` sets `ctx.state.provenanceExecution` for the duration of `run`.
- **It records the review.** A publish reviews the fields in `hashes` before it runs, so the guard lets it through. An update reviews what it changed, since the queued edit is what the reviewer saw. Unpublish and delete review nothing.

A queue that short-circuits writes must register its Document Service middleware in `register`. This plugin registers in `bootstrap`, and middlewares run in registration order, so the queue parks a publish before the guard can refuse it. The API test locks this order. A parked result must not have a `documentId`: the middleware then records nothing.

### Storage

Provenance lives in its own table, `provenance_fields` (content type `plugin::provenance.field-provenance`), one row per entry (document, locale, status) and field. Token profiles live in `provenance_token_profiles`. Content tables are not changed.

Each row stores the hash of the value it describes. When a value changes outside the Document Service (raw query, script), the hashes no longer match and the field reads as `unattributed` with `drifted: true`. The publish guard still treats such a row as AI until someone reviews the current value: it fails closed.

The indexes stay under MySQL's 3072-byte key limit (three `varchar(255)` utf8mb4 columns at most).

### Concurrency

On Postgres, MySQL and MariaDB, requests on the same document run in parallel, and the plugin reads values and rows before it writes. Without serialization this produced duplicate rows, lost AI lineage and publish-guard bypasses. So every update, publish, discardDraft, unpublish, delete, review and declare of a document first locks that document (`lockDocument` in [`server/src/services/provenance.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/server/src/services/provenance.ts)), including updates without a tracked field (the Content Manager runs one before publishing):

- The lock is a row of `provenance_document_locks` (one per content type and documentId, unique index), locked with `SELECT … FOR UPDATE` on the transaction's own connection. Content rows cannot serve as the lock: publishing deletes and recreates them while others wait, which deadlocked. Locking a missing row takes a gap lock on MySQL, so the row is created with a plain insert on document create and clone (`createLock`) and, for existing documents, once per content type at bootstrap (a plugin store flag remembers it); an upsert covers the rare missing row. Creating the row from a second connection exhausted the connection pool under load.
- Provenance rows are read with `FOR UPDATE`: on MySQL REPEATABLE READ, the Content Manager takes its snapshot before the plugin locks, and a locking read still returns the latest committed rows.
- SQLite has a single writer and skips all of this.

Writes to the same document therefore wait for each other (about 1 s for 30 parallel writes on one entry in the tests); writes to different documents do not.

### Document Service middleware

[`server/src/middlewares/document-service.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/server/src/middlewares/document-service.ts) wraps writes on `api::` content types:

- `create` and `update`: reads the previous values of the tracked fields in the payload, runs the write, then records only the fields whose hash changed. Saving an unchanged form keeps the existing provenance. A write that publishes (`status: 'published'`) is handled even without a tracked field in its payload. When an i18n non-localized field changes, core copies it to the other locales, and the middleware copies its rows there too (`review` and `declare` do the same). An update that creates a locale inherits the rows of the non-localized fields from an existing locale, since core copies their values even when the payload does not send them.
- `publish` and `discardDraft`: copy the rows from one status to the other. `create` and `update` with `status: 'published'` publish inside the repository, so the middleware copies the rows itself.
- `clone`: copies the rows of the source to the clone, then records the fields the request overrides like an update.
- `unpublish` and `delete`: remove the rows.

The content write and its provenance share one transaction. A failure to record provenance rolls the write back. It is registered in `bootstrap` (see [Approvals](#approvals)), so it runs inside the middlewares core plugins register earlier.

### License

The whole plugin is Enterprise, behind the license feature `cms-ai-governance` (`LICENSE_FEATURE` in `server/src/constants.ts` and `admin/src/constants.ts`). How Agent Governance is sold is still open, so the name may change. No license includes it yet: the API test switches the plugin's gate (`isProvenanceEnabled` on its settings service) rather than the license.

Without the feature:

- The Document Service middleware returns `next()` first, so nothing is recorded and no rule applies. The cost is the feature check.
- Every plugin route answers 404, and `?provenance=true` adds nothing.
- The admin panel registers nothing (`admin/src/index.ts`).

The server checks the feature on every use, so a license change applies without a restart. The admin reads it once, when the panel loads. A lapse leaves a gap: values written meanwhile read as `unattributed`, or with `drifted: true`, once the license is back. Existing provenance is kept.

### Audit Logs

Reviews, AI declarations and changes to the publish guard go to Enterprise Audit Logs, after the transaction commits: `provenance.fields.review`, `provenance.fields.declare`, `provenance.settings.update`. An approved review also carries the `pendingActionId`. There is no provenance audit interface: Audit Logs is the trail, and these rows say what the fields are now.

### Review rules

Settings > Provenance stores the rule in the plugin store (`plugin_provenance_settings`), read through a 30 second cache.

- **Publish guard** (`requireReviewBeforePublish`): `publish`, and `create`/`update` with `status: 'published'`, fail with a `ValidationError` while an AI-generated or AI-assisted field of the draft has no valid review. The error `details` map each field to a message, so the Content Manager shows it under the input. Content API writes publish by default, so an agent token must write drafts (`?status=draft`) while the guard is on. The guard applies whoever publishes: the approval queue only stops an agent's own publish, not a person publishing an agent's draft.

Review Workflows are left alone, as in the Agent Governance RFC. Rules tying stages to provenance (an approval stage only people can enter, a stage AI writes go to) were built and removed. They wait on the RFC's question about an agent-requested publish landing in a stage.

Tracked fields are top-level attributes (see `TRACKED_ATTRIBUTE_TYPES` in `server/src/constants.ts`). Relations are not AI content and media is not tracked yet.

A component or dynamic zone is tracked as one field: its instances have no stable identity, so a path such as `sections[2].title` would not survive a reorder. Every read that feeds a hash goes through the `values` service ([`server/src/services/values.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/server/src/services/values.ts)). It populates components and their nested components, without relations and media, and removes instance `id`s before hashing ([`server/src/domain/fields.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/server/src/domain/fields.ts)). Without that, publishing, which copies components with new ids, would make every component look changed. After a write, components are always read again rather than taken from the result, whose populate depends on the caller. An empty value (`null`, or an empty repeatable component or dynamic zone) gets no row on create or review.

## API

Admin routes (prefix `/provenance`):

| Route                                    | Permission                                          |
| ---------------------------------------- | --------------------------------------------------- |
| `GET /entries/:uid/:documentId`          | `plugin::content-manager.explorer.read` on `:uid`   |
| `GET /entries/:uid/:documentId/export`   | `plugin::content-manager.explorer.read` on `:uid`   |
| `GET /summary/:uid?documentIds=a,b`      | `plugin::content-manager.explorer.read` on `:uid`   |
| `POST /entries/:uid/:documentId/review`  | `plugin::content-manager.explorer.update` on `:uid` |
| `POST /entries/:uid/:documentId/declare` | `plugin::content-manager.explorer.update` on `:uid` |
| `GET /settings`                          | `plugin::provenance.settings.read`                  |
| `PUT /settings`                          | `plugin::provenance.settings.update`                |
| `GET /tokens`                            | `admin::api-tokens.read`                            |
| `PUT /tokens/:id`                        | `admin::api-tokens.update`                          |

Without the license feature every route answers 404.

`declare` lets an admin mark fields as AI after the fact, for instance text pasted from a chat assistant. It only accepts AI sources. A review of the same value is kept only if the field was already AI: a reviewer who approved it as human-written did not check it as AI output.

The entry routes use the Content Manager permission checker, like the edit view: the user needs the read (or update) permission on the entry itself, conditions and locale included, and they only see or change the fields their permission covers. `review` and `declare` also require a human session (`isHumanSession`): an agent, an admin API token or the MCP server acting for a user cannot review content, otherwise an agent could approve its own output. They apply to the draft only and run in a transaction. The request only chooses `locale`, `status` and `fields`: the content type and documentId always come from the route.

`export` is the provenance record of one version of an entry, the published one by default (`?status=draft` otherwise). It is a JSON attachment (`format: 'strapi-provenance/1'`) giving, per field, the source, its IPTC Digital Source Type URI ([`server/src/domain/iptc.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/server/src/domain/iptc.ts)), model, agent, the hash of the value and the reviewer of that exact value. It is not signed.

`summary` returns, per entry, the number of AI fields and of AI fields without a valid review, for at most 100 entries the user can read, counting only the fields they can read and one locale (the default one when none is given). It reads the provenance rows only, so drift is not checked.

`GET /tokens` lists Content API tokens only, and `PUT /tokens/:id` answers 404 for an admin token.

When the GraphQL plugin is installed, the plugin disables its shadow CRUD for both of its content types: otherwise a full-access API token could edit provenance rows or its own profile.

The `find` routes, admin and content API, also return `digitalSourceType` per field: an IPTC URI for AI sources, `null` otherwise.

Content API: `GET /api/provenance/entries/:uid/:documentId?locale=` returns the provenance of the published entry, without actor identifiers. The caller needs the route permission and `findOne` on the content type.

Content API reads also accept `?provenance=true` on the core `find` and `findOne` routes of API content types (registered with `strapi.contentAPI.addQueryParams`, since the Content API rejects unknown query params). [`server/src/middlewares/query-provenance.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/server/src/middlewares/query-provenance.ts), a Koa middleware added in `bootstrap` (the router is mounted later, when the server listens), then adds `meta.provenance`: keyed by field for one entry, and for a list an array in the order of `data` (a document can appear once per locale). The locale used is the stored one, so a response narrowed with `fields` without `locale` is still matched. It only describes the fields present in the response, so private fields and `fields` narrowing are respected. The values to hash are read again in one query per locale, because the response holds sanitized and populated values; the provenance rows are read in one query. Without the param, nothing changes and nothing is read.

## Admin

- Next to each top-level field label ([`admin/src/content-manager/FieldLabelAction.tsx`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/admin/src/content-manager/FieldLabelAction.tsx)): the AI badge of the field (warning color until reviewed, tooltip with model, agent and reviewer), or a ✨ "Mark as AI" button. A field edited since the last save is marked after the next save ("AI on save", click to cancel). A pasted field shows "AI?". It goes through the `Admin/CM/pages/EditView/mutate-edit-view-layout` hook and the field `labelAction`, which components and dynamic zones also render. The hook is registered in `bootstrap` because i18n registers its own there and replaces `labelAction`; ours keeps the existing action (the globe). The labels are outside the panel's React tree, so the panel publishes its state in a small store ([`admin/src/store/fields.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/admin/src/store/fields.ts)).
- The edit view side panel shows a summary: fields awaiting review, whether publishing is blocked, and a count per source. "See fields" opens a modal with every field, "Mark as AI" per field and "Confirm I reviewed all fields".
- Paste detection ([`admin/src/hooks/usePasteDetection.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/admin/src/hooks/usePasteDetection.ts)): the panel listens to `paste` events while the edit view is open. It compares the form values (`useForm(...).getValues`) right before and after the paste, and keeps the fields whose value changed and now contains the start of the pasted text. This works for Blocks and Markdown editors without reading their DOM. Pastes under 40 characters are ignored. A card fixed to the bottom right of the edit view ([`admin/src/components/PastePrompt.tsx`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/admin/src/components/PastePrompt.tsx), rendered in a portal) asks whether the pasted text comes from an AI, with "AI" and "Other source" for all pasted fields at once; "Field by field" opens the modal to answer per field. There is no toast. "AI" is sent to the `declare` route after the next save, so the declaration describes the saved value.
- The list view of API content types gets an "AI content" column, filled by one `summary` request per page ([`admin/src/utils/summaries.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/provenance/admin/src/utils/summaries.ts) groups the cells' requests). The column hook does not receive the content type, so it reads it from the URL.
- An "AI to review" toggle (`listView.actions` injection zone) adds `plugins[provenance][provenanceReview]=pending` to the list URL. The Content Manager sends it as the `provenanceReview` query parameter, and the middleware adds a `documentId` filter to the `findMany` and `count` of that list. The documents are found with one `SELECT DISTINCT` on the provenance table, once per request. Above 10,000 such documents in the content type, the filter returns a validation error, because databases limit bound values. Like `summary`, it ignores drift.
- The fields modal has "Export provenance record", which calls `export`.
- Settings > Provenance holds the publish guard and the Content API tokens with their profile.

## Testing

- Domain and service logic: `yarn test:unit:vitest` in the package (`*.vitest.test.ts`).
- Admin components: `yarn test:front` (Jest and Testing Library, `admin/src/**/tests/*.test.tsx`): label action, paste card, Publish wrapper, edit view hook, list summaries, the license gate.
- API: [`tests/api/plugins/provenance`](https://github.com/strapi/strapi/blob/develop/tests/api/plugins/provenance/provenance.test.api.ts). The test app does not depend on the plugin: the suite adds `@strapi/plugin-provenance` to `info.dependencies` in the `register` hook of its own instance, so other suites run without it. It deletes the tokens it creates, since other suites count them. It stands in for Agent Governance with a test auth strategy (an admin user of kind `agent`) and a Document Service middleware that parks publishes.
- There is no E2E domain: every E2E domain shares one app built from `tests/app-template`, and installing the plugin there would change every edit view and list. Check these by hand in a getstarted app before merging admin changes: a paste in the Markdown and Blocks editors (card, "AI?" next to the label, "AI on save", Save), "Mark as AI" on an unchanged and on an edited field, Publish disabled until Save, the publish guard error under the input, the "AI to review" toggle, Content History opening without error, a single type, the clone screen.
- Concurrency only shows on Postgres, MySQL and MariaDB (SQLite serializes writes): run parallel reviews, saves and publishes on one document there after changing the middleware or the lock.

## Cost

Reads through the Document Service are unchanged. Measured on SQLite with the getstarted `article` content type: create +1 SQL statement, update of one field +4, update with no change +1, publish +3, delete +1. The publish guard reads values only when the entry has AI rows.

Components and dynamic zones cost more: each is read before and after the write, with one query per component level. A Content Manager save of the getstarted `restaurant` (nested components and a dynamic zone) costs about +22 statements even with no change, because the admin sends every component.

## Limits

- Uninstalling the plugin drops its tables when Strapi syncs the schema, and the provenance is lost. A license lapse does not.
- Writes that bypass the Document Service are invisible. Values changed this way read as `unattributed` (drift).
- Rows name people: `actorId` and `reviewedById` are admin user ids, stored as strings without a foreign key, with no retention period. Deleting an admin user keeps the ids, and the review stays valid with no name to show. Nothing erases them on request: erasing would also remove what the record is for, so a project has to decide. The Content API never exposes them.
- Restoring a Content History version is a write by the restoring user: the restored values are recorded as theirs (`ai-assisted` if the field was AI).
- The Content API turns the plugin's `ForbiddenError` messages into a plain "Forbidden".
- There is no unique key on a provenance row: a unique index would fail the schema sync of a database that already holds a duplicate, and would not cover content types without i18n (`NULL` locales are distinct). The document lock prevents duplicates; readers keep the latest row if one exists.
- Lock rows are never deleted: one small row per document ever written.
- `strapi export`, `import` and `transfer` carry the provenance rows and keep their hashes valid. Admin users are not transferred, so `actorId` and `reviewedById` can point at nobody, or at someone else, on the target. Tested with export and import.
- On MariaDB 11.6+ (`innodb_snapshot_isolation=ON`), concurrent Content Manager publishes of the same document can fail with error 1020: those routes read in their own transaction before the plugin takes its lock. The same storm fails without the plugin; data stays consistent.
- Pastes on the create screen are not detected: the panel only shows on existing entries. A pending paste is lost if the editor leaves the page before saving.
- Provenance is stored per field, not per paragraph. A partial AI rewrite of a rich text field shows as one source for the whole field.
