# Publish Draft-Relations Warning by Relation Type

> Source: `tests/e2e/tests/content-manager/publish-draft-relations-by-relation-type.spec.ts`

## User Story: Warn on publish when a bidirectional many-to-many relation links to a draft-only entry

**As a** content editor **I want** a confirmation dialog when publishing a document whose bidirectional many-to-many relation points to a draft-only entry **so that** I understand the linked entry won't appear live until it too is published.

### Acceptance Criteria

- **Given** a new Article with its `authors` field linked to the draft-only author "Coach Beard" **When** I save and click "Publish" **Then** a "Confirmation" dialog appears with text matching "linked entry/entries is/are still in draft" **And** a plain "Publish" button is shown (the relation itself is kept, not stripped).
- **Given** the `authors` field instead linked to an already-published author ("Jane Smith") **When** I click "Publish" **Then** no confirmation dialog appears and the document publishes directly.
- **Given** a "Relation lab" entry with its bidirectional `manyToManyBi` field linked to a draft-only "Relation target" **When** I click "Publish" **Then** the same "still in draft" many-to-many warning dialog appears with a plain "Publish" button.
- **Given** the `manyToManyBi` field instead linked to an already-published target **When** I click "Publish" **Then** no confirmation dialog appears.
- **Given** a "Relation lab" entry with both an xToOne field (`manyToOne`) and the bidirectional `manyToManyBi` field, each linked to a distinct draft-only target **When** I click "Publish" **Then** a "danger" confirmation dialog appears, with text about relations that would "not be included in the published version" and mentioning the "many-to-many link" **And** only a "Publish without relations" button is shown (no plain "Publish" option).

## User Story: Warn on publish when an xToOne-style relation links to a draft-only entry

**As a** content editor **I want** a confirmation dialog when publishing a document whose one-directional relation (`manyToOne`, `oneToOne`, `oneToMany`, or a unidirectional `manyToMany`) points to a draft-only entry **so that** I know that relation will be stripped from the published version until its target is published.

### Acceptance Criteria

- **Given** a "Relation lab" entry with its `manyToOne`, `oneToOne`, or `oneToMany` field linked to a draft-only "Relation target" **When** I click "Publish" **Then** a "Confirmation" dialog appears with text matching "related to ... draft entry/entries" **And** a "Publish without relations" button is shown.
- **Given** any of those same fields instead linked to an already-published target **When** I click "Publish" **Then** no confirmation dialog appears.
- **Given** a "Relation lab" entry with a unidirectional `manyToMany` field linked to a draft-only target **When** I click "Publish" **Then** the same xToOne-style warning dialog appears.
- **Given** the unidirectional `manyToMany` field instead linked to an already-published target **When** I click "Publish" **Then** no confirmation dialog appears.
- **Given** a "Relation lab" entry whose `oneToMany` field links to both an already-published target and a draft-only target **When** I click "Publish" **Then** the xToOne-style warning dialog still appears, because at least one linked target remains in draft.
- **Given** the `Shop` single type's "Product carousel - 23/24 kits" component with an unpublished product selected **When** I click "Publish" **Then** the xToOne-style warning dialog appears.
- **Given** the same component with an already-published product selected instead **When** I click "Publish" **Then** no confirmation dialog appears and the document publishes directly.
