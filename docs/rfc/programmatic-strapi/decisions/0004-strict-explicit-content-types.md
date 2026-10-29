# ADR-0004: Strict, explicit content types (no legacy magic)

**Status:** Accepted

## Context

The file-based content-type loader carries legacy conventions: auto singular→plural
inference, implicit `collectionName`/`globalId` derivation, folder-name-as-apiName. A new
surface is an opportunity to remove ambiguity.

## Decision

The programmatic path uses its **own stricter normalizer/validator**, separate from the
untouched file-based one:

- `singularName` **and** `pluralName` are both **required** — no auto-pluralization;
  missing either throws at startup.
- `collectionName` / `globalId` are explicit, with defaults only where unambiguous.
- `uid` is still constructed (`api::<apiName>.<singularName>`) because it is structural
  and referenced everywhere (Document Service, relation targets). `apiName` defaults to
  `singularName` (ADR-0011).
- Phase 1 supports component _references_, but programmatic component _definitions_
  (`defineComponent`) are Phase 3; in-code component attributes need the component loaded
  via `fromDisk` until then.

## Consequences

- Predictable, typo-resistant naming; better TS inference foundation for Phase 3.
- A second normalizer to maintain (acceptable; it is small and only on the new path).

## Alternatives considered

- **Reuse the legacy normalizer.** Rejected: re-imports the magic we want to drop and
  couples the new surface to legacy quirks.
