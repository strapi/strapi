# ADR-0011: `apiName` defaults to `singularName`

**Status:** Accepted

## Context

Every content type needs a `uid` of the form `api::<apiName>.<singularName>`. In legacy,
`apiName` is the API folder name, which can group multiple content types. Programmatic
content types have no folder.

## Decision

For programmatic content types, **`apiName` defaults to `singularName`**, giving each
content type its own API namespace and a predictable `uid` `api::<singular>.<singular>`
(e.g. `api::article.article`). `apiName` is **overridable** to group several content
types under one API namespace.

## Consequences

- Predictable UIDs for relation targets and Document Service access.
- Per-CT namespaces by default; explicit grouping when desired.
- Matches the auto-CRUD mounting at `/api/<pluralName>` (ADR-0003).

## Alternatives considered

- **Require explicit `apiName` always.** Rejected: needless boilerplate for the common
  one-CT-per-API case.
- **Single shared default apiName (e.g. `'api'`).** Rejected: collides as soon as there
  are two content types and muddies UIDs.
