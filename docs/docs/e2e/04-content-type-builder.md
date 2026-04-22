---
sidebar_position: 5
sidebar_label: Content-Type Builder
---

# Content-Type Builder

End-to-end Playwright coverage for the Content-Type Builder (CTB) admin feature, exercising the creation, editing and deletion of collection types, single types and components.

## Overview

The Content-Type Builder is the admin surface that lets developers define the data shape of a Strapi project. These specs drive the UI through realistic workflows — creating content types with every supported field, toggling plugin-level options such as internationalisation and draft & publish, editing relations, wiring up components into both collection and single types, and validating UID generation rules. Because most scenarios trigger a server restart after each schema change, suites run with a generous 500s timeout and rely on the shared setup, data-import and file-reset utilities to keep the workspace clean between tests. Specs are organised by content-type shape (collection, single, component), with a couple of standalone files for the landing Edit View and the guided tour.

## Test specs

### collection-type

#### `content-type-builder/collection-type/create-collection-type.spec.ts` — Create collection type with all field types

**Purpose:** verifies that a collection type can be created end-to-end with every field type the CTB supports, including relations, components and a dynamic zone.

**Preconditions:**

- Shared setup `ctb-edit-ct` with an authenticated admin session.
- Files are reset and the `with-admin` data fixture is imported.
- The Content-Type Builder link is clicked to land on the CTB home.
- A 500s describe-level timeout because of repeated server restarts.

**Scenarios covered:**

- `Create collection type with all field types` -> `Can create a collection type with all field types`: creates `Secret Document` (singular `secret-document`, plural `secret-documents`) and attaches text (with regex), boolean, blocks, JSON, integer/big-integer/decimal numbers, email, date/time/datetime, password, single and multiple media, every relation variant (`oneWay`, `oneToOne`, `oneToMany`, `manyToOne`, `manyToMany`, `manyWay`) against `Article`, enumeration, markdown, a brand-new component in a new category, a repeatable component in an existing category, a reused existing component, and a dynamic zone containing a new component.

#### `content-type-builder/collection-type/edit-collection-type.spec.ts` — Edit collection type

**Purpose:** covers editing flows on an existing collection type, including relation remapping, plugin toggles, field additions, renaming and deletion.

**Preconditions:**

- Files are reset before the shared setup, then `ctb-edit-ct` is run with login, file reset and the `with-admin` import.
- Navigation lands on the `Article` collection type.
- 500s describe-level timeout.
- A final `afterAll` resets files to restore the workspace.

**Scenarios covered:**

- `Edit collection type` -> `Can update relation of type manyToOne to oneToOne`: adds a `manyToOne` relation to `Product`, saves with restart, then edits the same relation and switches it to `oneToOne` (regression for GH#21398).
- `Edit collection type` -> `Can toggle internationalization`: disables Internationalisation from Advanced settings (accepting the data-loss confirmation), restarts and re-enables it to confirm no confirmation is required the second time.
- `Edit collection type` -> `Can toggle draft&publish`: disables Draft & publish (with the data-loss prompt), restarts, then re-enables it to confirm the absence of a confirmation prompt on the round-trip.
- `Edit collection type` -> `Can add a field with default value`: adds a `testfield` text field with a default value of `mydefault` configured from the Advanced settings tab.
- `Edit collection type` -> `Can configure advanced settings for multiple fields sequentially`: adds two text fields in succession, asserting that the modal always reopens on Basic settings before the user moves to Advanced settings (guards against a known flaky modal state regression).
- `Edit collection type` -> `Can change type name`: renames the type via the Edit dialog and confirms the new heading appears after restart.
- `Edit collection type` -> `Can delete type`: opens the Edit dialog, accepts the browser confirmation, and verifies the type heading is no longer present after restart.
- `Edit collection type` -> `Can enable localization on a content type, create a text field, disable internationalization on the field and enable uniqueness on the same field`: combined flow that adds a localised text field, disables localisation on that field, then enables the Unique constraint, restarting between each change.

#### `content-type-builder/collection-type/uid-generation.spec.ts` — Content Type UID generation

**Purpose:** validates the UID auto-generation rules and the associated singular/plural validation.

**Preconditions:**

- Shared setup `ctb-uid-generation` with login, file reset and `with-admin` data.
- The CTB link is clicked to start from the builder home.

**Scenarios covered:**

- `Content Type UID Generation` -> `Should generate UID from singular name, not display name`: enters `Members` as display name, manually corrects the singular API ID to `member`, asserts plural resolves to `members`, creates the type with a `title` text field, and confirms the resulting URL is `content-types/api::member.member`.
- `Content Type UID Generation` -> `Should show error when singular and plural names are the same`: enters `Cities` as display name, verifies that both singular and plural auto-populate to `cities` and that Continue is blocked with "This value cannot be the same as the plural one" / "the singular one" messages, then corrects the singular to `city`, creates the type and confirms the UID is `api::city.city`.

### components

#### `content-type-builder/components/create-components.spec.ts` — Create a new component

**Purpose:** ensures components can be created both in isolation with a fresh category and with the full catalogue of supported attributes.

**Preconditions:**

- Shared setup `create-component` with file reset, `with-admin` import and admin login.
- A no-op `afterSetup` callback so the shared setup exits on the default admin landing page.
- 500s describe-level timeout.

**Scenarios covered:**

- `Create a new component` -> `Can create a component with a new category`: creates `TestNewComponent` under a newly created `BlogPosts` category with a single `sometextfield` text attribute and the `paint` icon.
- `Create a new component` -> `Can create a component with all field types`: creates `ArticlesComponent` in the existing `product` category and attaches text (with regex), boolean, blocks, JSON, integer/big-integer/decimal numbers, email, date/time/datetime, password, single and multiple media, `oneWay` and `manyWay` relations to `Article`, enumeration, markdown, a new single component in a new category, a new repeatable component in an existing category, and a reused existing component.

#### `content-type-builder/components/edit-components.spec.ts` — Update a new component

**Purpose:** checks that component schema changes propagate to every content type that embeds the component.

**Preconditions:**

- Shared setup `update-component` with file reset, `with-admin` import and login.
- An `afterSetup` hook creates `SomeComponent` in a new `BlogPosts` category with one `testtext` attribute, then navigates via Content Manager back into the CTB, creates `Mycollectiontype` and `Singletypepage` (each embedding `SomeComponent` under the attribute name `mycomponentname`). The detour through Content Manager works around GH#21943.
- 500s describe-level timeout.

**Scenarios covered:**

- `Update a new component` -> `Add attribute to component`: adds a required text attribute (`addedtext` with a regex) to `SomeComponent` and asserts the new attribute is visible from both the collection-type and the single-type that embed the component.
- `Update a new component` -> `Remove attribute from component`: first confirms `testtext` is visible from both parent content types, removes it from `SomeComponent` and asserts it has disappeared from both.
- `Update a new component` -> `delete component`: confirms the component is listed under both parent types and in the sidebar navigation, deletes `SomeComponent`, then asserts it vanishes from both parents and the sidebar.

### single-type

#### `content-type-builder/single-type/create-single-type.spec.ts` — Create single type with all field types

**Purpose:** mirrors the collection-type creation coverage for single types, ensuring the single-type creation flow supports every field and composite type.

**Preconditions:**

- Shared setup `ctb-edit-st` with login, file reset and the `with-admin` data import.
- The Content-Type Builder link is clicked to land on the CTB home.
- 500s describe-level timeout.

**Scenarios covered:**

- `Create single type with all field types` -> `Can create a collection type with all field types`: creates the `Secret Document` single type (singular `secret-document`) with text (regex), boolean, blocks, JSON, integer/big-integer/decimal numbers, email, date/time/datetime, password, single and multiple media, `oneWay` and `manyWay` relations to `Article`, enumeration, markdown, a new component in a new category, a new repeatable component in an existing category, a reused existing component, and a dynamic zone containing a new component.

#### `content-type-builder/single-type/edit-single-type.spec.ts` — Edit single type

**Purpose:** covers editing flows on the existing `Homepage` single type, mirroring the collection-type editing suite.

**Preconditions:**

- Files are reset before the shared setup, then `ctb-edit-st` runs with login, file reset and `with-admin` data.
- Navigation lands on the `Homepage` single type.
- 500s describe-level timeout with a final `afterAll` file reset.

**Scenarios covered:**

- `Edit single type` -> `Can update relation of type manyToOne to oneToOne`: adds a relation from `Homepage` to `Product`, saves with restart, edits the relation and switches it to `oneToOne` (GH#21398 regression).
- `Edit single type` -> `Can toggle internationalization`: disables Internationalisation from Advanced settings with the data-loss prompt, then re-enables it and verifies the second pass does not prompt.
- `Edit single type` -> `Can toggle draft&publish`: disables and re-enables Draft & publish, confirming the data-loss prompt only appears when disabling.
- `Edit single type` -> `Can add a field with default value`: adds `testfield` with default value `mydefault` via Advanced settings.
- `Edit single type` -> `Can configure advanced settings for multiple fields sequentially`: adds two sequential text fields, asserting that Basic settings is the active tab each time the modal reopens.
- `Edit single type` -> `Can change type name`: renames the type through the Edit dialog and verifies the new heading after restart.
- `Edit single type` -> `Can delete type`: deletes the type from the Edit dialog (accepting the browser confirmation) and asserts the heading is gone after restart.
- `Edit single type` -> `Can enable localization on a content type, create a text field, disable internationalization on the field and enable uniqueness on the same field`: combined flow adding a localised text field, disabling localisation on it and then enabling the Unique constraint.

### Top-level specs

#### `content-type-builder/ctb-edit-view.spec.ts` — Edit View CTB

**Purpose:** smoke-tests the CTB landing page, ensuring the key action buttons on a single type render correctly.

**Preconditions:**

- The database is reset from the `with-admin` path.
- The admin page is navigated to directly and `login` is called.

**Scenarios covered:**

- `Edit View CTB` -> `A user should be able to navigate to the Edit View of the content type builder and see the contentype fields`: navigates to the CTB via `Article`, opens the `Shop` single type, and asserts that two `Add another field to this component` buttons, the `Add a component` button and the `Add another field to this single type` button are all visible.

#### `content-type-builder/guided-tour.spec.ts` — Guided tour (AI chat)

**Purpose:** verifies the Content-Type Builder guided tour and its AI chat handoff on Enterprise Edition builds.

**Preconditions:**

- Enterprise Edition only — the suite is skipped when `STRAPI_DISABLE_EE === 'true'` via `describeOnCondition`.
- `setGuidedTourLocalStorage` primes the admin local storage so the tour is enabled.
- Shared setup `guided-tour` with login, file reset and the `with-admin` import.

**Scenarios covered:**

- `Guided tour - Content Type Builder (AI Chat)` -> `should see the ai content-type-builder tour if ai isenabled`: clicks the `Start` link on the `Create your schema` tour item, asserts the `Welcome to the Content-Type Builder!` dialog is shown, and — when the `cms-ai` feature flag is enabled — advances through the tour dialogs and confirms the `Ask Strapi AI...` textbox becomes visible.
