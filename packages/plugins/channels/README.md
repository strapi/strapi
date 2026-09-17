# @strapi/plugin-channels

Delivery channels for Strapi 5: serve **per-channel variants of the same
content** — same document, same locale, same draft/published version — with
per-channel field visibility and value overrides. One deployment, one entry,
and `mobile` / `tablet` / `desktop` (or any channels you define) each get
their own view of it.

## How it works

Overrides are stored as **sparse overlays**, never as copies of your entries:

- `strapi_channels` — the channel definitions (slug, name, color, order,
  archived), managed from **Settings → Channels**.
- `strapi_channel_overrides` — one row per
  `(channel, content type, document, locale, draft|published)` holding a JSON
  map of **only the overridden attributes**. A unique index guarantees one row
  per key.

A document-service middleware (registered in the plugin's `register()` so it
runs ahead of i18n, Content History and Spaces):

- **reads** — lays the channel's overrides over the entry per attribute
  (draft _and_ published), then strips the attributes hidden on that channel;
- **update on a channel** — validates, diffs against the channel view and
  records a draft override; **the base row is never written**;
- **publish / unpublish / discardDraft / delete / clone** — snapshots, prunes
  or copies the override rows so they always mirror the entry's lifecycle.
  Releases publish through `documents.publish()`, so release publishing
  carries channel overrides with no extra wiring.

## Selecting a channel

Requests pick their channel with a header — never a query param:

```http
GET /api/articles
X-Strapi-Channel: mobile
```

- No header (or `default`) = the base content.
- Unknown or archived slug = `400`.
- Works identically on REST, GraphQL and the admin (the admin stores the
  active channel in `localStorage` and stamps the header via a fetch
  interceptor, like the Spaces and Branches plugins).

## Opting in

Channels are opt-in at both levels, from the Content-Type Builder:

```jsonc
// content type
"pluginOptions": { "channels": { "enabled": true } }

// attribute: the value can vary by channel
"pluginOptions": { "channels": { "overridable": true } }

// attribute: hidden everywhere but desktop (empty/missing = visible everywhere)
"pluginOptions": { "channels": { "overridable": true, "visibleIn": ["desktop"] } }
```

Non-overridable attributes are identical on every channel: the admin disables
them when a channel is active, and a channel write that would change one is
refused with a `ValidationError` naming it (unchanged attributes in a full
Content Manager payload pass).

With i18n, an override on a **non-localized** attribute is stored once on a
shared row and applies to every locale — there is no cross-locale sync to run,
by construction.

With the Spaces plugin installed, channel definitions are **per workspace**
(the channel content type is space-scoped); without it, they are global.
Neither plugin depends on the other.

## Known v1 limitations

- **Filters, sort and search run on base values.** An overridden value is
  applied after the query. Don't mark filter keys (slugs, references,
  categories…) as overridable — `unique` fields shouldn't be overridable at
  all.
- **Relations inside components** can't be overridden on a channel (explicit
  error; top-level relations, media, components and dynamic zones work).
- `update` with `status: 'published'` under a channel records the override but
  **does not auto-publish** — publishing stays a document-level action.
- `count` counts base rows; overlays never add or remove documents.
- Content History records base writes only; channel overrides don't appear in
  it yet.
- The Content Manager's relation pickers list base relation values while a
  channel is active (responses are correct; the widget preview is not
  channel-aware yet).
