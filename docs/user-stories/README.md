# User Stories & Acceptance Criteria

These documents are derived from the Strapi end-to-end (Playwright) test suite in
[`tests/e2e/tests`](../../tests/e2e/tests). Each markdown file maps 1:1 to a spec
file and captures the behavior that is **currently covered** by automated tests,
expressed as user stories with acceptance criteria.

> Generated from the e2e specs. The acceptance criteria reflect what the tests
> actually assert — nothing is invented beyond test coverage. Behavior gated
> behind feature flags or editions (EE-only, `describeOnCondition`, etc.) is
> noted in the relevant file. Tests marked `test.skip` / `test.fixme` are
> flagged as not-yet-enforced.

## Format conventions

Each file maps 1:1 to a spec under [`tests/e2e/tests`](../../tests/e2e/tests),
mirroring its path, and follows this structure:

```markdown
# <Title>

> Source: `tests/e2e/tests/<path>`

## User Story: <short behaviour name>

**As a** <role> **I want** <capability> **so that** <benefit>.

### Acceptance Criteria

- **Given** <precondition> **When** <action> **Then** <expected outcome> **And** <extra outcome>
```

- One **User Story** per meaningful `test()` / `test.describe()` block.
- **Acceptance Criteria use Given/When/Then (Gherkin)** — one scenario per bullet,
  `**Given** … **When** … **Then** …`, with `**And**` for chained
  preconditions or outcomes.
- Only behaviour the tests actually cover is documented; concrete detail
  (messages, labels, statuses, etc.) is preserved verbatim.

> These docs are generated and kept in sync via the `userstory-e2e` skill
> (`.claude/skills/userstory-e2e/`). Run it to regenerate or update after specs
> change.

## Index

### Admin

- [Auth sessions](admin/admin-auth-sessions.md)
- [Admin tokens](admin/admin-tokens.md)
- [API tokens](admin/api-tokens.md)
- [Home (EE)](admin/ee-home.md)
- [Guided tour](admin/guided-tour.md)
- [Home customization](admin/home-customization.md)
- [Home](admin/home.md)
- [Login](admin/login.md)
- [Logout](admin/logout.md)
- [Signup](admin/signup.md)
- [Transfer tokens](admin/transfer-tokens.md)

### Content Manager

- [Blocks](content-manager/blocks.md)
- [Bulk actions](content-manager/bulk-actions.md)
- [Cloning](content-manager/cloning.md)
- [Create content](content-manager/create-content.md)
- [Date fields](content-manager/date.md)
- [Decimal field hint](content-manager/decimal-field-hint.md)
- [History](content-manager/history.md)
- [Home widgets](content-manager/home-widgets.md)
- [List view](content-manager/listview.md)
- [Preview](content-manager/preview.md)
- [Uniqueness](content-manager/uniqueness.md)
- Conditional fields
  - [Boolean → many-to-many relation visibility](content-manager/conditional-fields/boolean-conditional-many-to-many-relation-visibility.md)
  - [Boolean → select relation](content-manager/conditional-fields/boolean-conditional-select-relation.md)
  - [Boolean → text field visibility](content-manager/conditional-fields/boolean-conditional-text-field-visibility.md)
  - [Enum → text field visibility](content-manager/conditional-fields/enum-conditional-text-field-visibility.md)
- Edit view
  - [Boolean clear button](content-manager/edit-view/boolean-clear-button.md)
  - [Collection type edit view](content-manager/edit-view/collection-type-edit-view.md)
  - [Collection type edit view errors](content-manager/edit-view/collection-type-edit-view-errors.md)
  - [Enumeration fields](content-manager/edit-view/enumeration-fields.md)
  - [Single type edit view](content-manager/edit-view/single-type-edit-view.md)
- Relations on the fly
  - [Create relation](content-manager/relations-on-the-fly/create-relation.md)
  - [Create relation & save](content-manager/relations-on-the-fly/create-relation-and-save.md)
  - [Create relation & publish](content-manager/relations-on-the-fly/create-relation-and-publish.md)
  - [Create relation (editor)](content-manager/relations-on-the-fly/create-relation-editor.md)
  - [Create relation in component & save](content-manager/relations-on-the-fly/create-relation-in-component-and-save.md)
  - [Create relation in new component & save](content-manager/relations-on-the-fly/create-relation-in-new-component-and-save.md)
  - [Edit relation](content-manager/relations-on-the-fly/edit-relation.md)

### Content Releases

- [Document status](content-releases/document-status.md)
- [Home widgets](content-releases/home-widgets.md)
- [Release details page](content-releases/release-details-page.md)
- [Releases page](content-releases/releases-page.md)

### Content-Type Builder

- [CTB edit view](content-type-builder/ctb-edit-view.md)
- [Guided tour](content-type-builder/guided-tour.md)
- Collection type
  - [Create collection type](content-type-builder/collection-type/create-collection-type.md)
  - [Edit collection type](content-type-builder/collection-type/edit-collection-type.md)
  - [UID generation](content-type-builder/collection-type/uid-generation.md)
- Components
  - [Create components](content-type-builder/components/create-components.md)
  - [Edit components](content-type-builder/components/edit-components.md)
- Single type
  - [Create single type](content-type-builder/single-type/create-single-type.md)
  - [Edit single type](content-type-builder/single-type/edit-single-type.md)

### Internationalization (i18n)

- [Bulk locale modal](i18n/bulk-locale-modal.md)
- [Create & edit](i18n/create-edit.md)
- [Edit view](i18n/editview.md)
- [Fill from another locale](i18n/fill-from-locale.md)
- [List view](i18n/listview.md)
- [Localized fields](i18n/localized-fields.md)
- [Permissions](i18n/permissions.md)
- [Settings](i18n/settings.md)

### Media Library

- [Cancel deletion](media-library/cancel-deletion.md)
- Future (UNSTABLE_MEDIA_LIBRARY)
  - [Asset details](media-library/future/asset-details.md)
  - [File upload](media-library/future/file-upload.md)
  - [Folder creation](media-library/future/folder-creation.md)
  - [Grid view](media-library/future/grid-view.md)

### Review Workflows

- [Content manager](review-workflows/content-manager.md)
- [Home](review-workflows/home.md)
- [Settings](review-workflows/settings.md)

### Search

- [Content type search](search/content-type.md)

### Settings

- [Smoke test](settings/smoke-test.md)
- RBAC actions
  - [Assign role to user](settings/rbac/actions/assign-role-to-user.md)
  - [Create role](settings/rbac/actions/create-role.md)
  - [Delete role](settings/rbac/actions/delete-role.md)
  - [Edit role](settings/rbac/actions/edit-role.md)
  - [See role](settings/rbac/actions/see-role.md)
- RBAC scenarios
  - [Create new role](settings/rbac/scenarios/create-new-role.scenario.md)
