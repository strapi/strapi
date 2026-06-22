# ADR-0007: Admin server module always loads; "headless" = no panel

**Status:** Accepted

## Context

The "programmatic / headless" framing suggested a pure API with no admin at all. Code review
shows `admin` is an always-on **provider** (not a plugin): it `require`s
`@strapi/admin/strapi-server` at init and registers `admin::user` plus permission content
types. Every content type also gets `createdBy`/`updatedBy` relations targeting
`admin::user` (`addCreatorFields`).

## Decision

In Phase 1, the **admin server module always loads** (unchanged provider behavior).
"Headless" means only that the admin **panel** is not built or served
(`serveAdminPanel: false`). `@strapi/admin` remains a runtime dependency even for a pure
API.

## Consequences

- Content-type creator relations resolve with no special-casing; RBAC/permissions intact.
- A "pure API" still pulls `@strapi/admin` server code (a known weight; revisit in a
  later phase if a truly admin-free core is desired — would require severing the
  `admin::user` creator-relation dependency).
- Clarifies the "zero-plugin boot" question: admin is a provider, not a plugin, so the
  import-and-add plugin model (ADR-0006) does not affect it.

## Alternatives considered

- **Strip admin entirely in headless mode.** Rejected for Phase 1: creator relations and
  permission content types depend on `admin::user`; removing it is a much larger change.
