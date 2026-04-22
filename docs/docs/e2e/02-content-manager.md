---
sidebar_position: 3
sidebar_label: Content Manager
---

# Content Manager

End-to-end coverage for the Content Manager: CRUD on collection and single types, the edit view, list view, bulk actions, cloning, history, preview, home widgets, field-level behaviour (blocks, dates, decimals, enumerations, booleans, uniqueness), conditional fields, and the relations-on-the-fly modal flows.

## Overview

These Playwright specs exercise the admin Content Manager end-to-end against a freshly seeded database. Collectively they validate authoring flows (create, save, publish, modify, discard, unpublish, delete), document-level features (history, preview, cloning, uniqueness), list-view behaviours (filtering, pagination, bulk publish/unpublish/delete, configurable bulk actions), home-page widgets, and a wide range of field behaviours including blocks editor, date pickers, decimal hints, enumerations, boolean clear buttons, and conditional visibility driven by booleans or enums. A dedicated set of specs covers the "relations on the fly" modal, including creating and editing related documents from within a parent entry, nesting relations, navigating via back/full-page, and surfacing unsaved-change confirmations. Almost every spec begins from a database seeded with the `with-admin` dataset and logs in before acting; EE-only features are gated with a conditional describe.

## Test specs

### Root

#### `content-manager/blocks.spec.ts` — Blocks editor code blocks

**Purpose:** Verifies that the blocks editor can convert a text block to a code block, assign a language, and persist that change across reloads.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.

**Scenarios covered:**

- `Blocks editor` -> `adds a code block and specifies the language`: types text into the Homepage blocks editor, uses the toolbar to convert it to a code block, selects the Fortran language, saves, reloads, and confirms the block and language persist. Skipped on Firefox due to a known toolbar-focus quirk.

#### `content-manager/bulk-actions.spec.ts` — Disabling bulk actions per content type

**Purpose:** Confirms that bulk actions on the list view can be turned off via the "Configure the view" settings.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.

**Scenarios covered:**

- `Bulk actions` -> `As a user I want to be able to disable the bulk actions on a content type`: selects all Article rows to confirm the Publish button appears, disables "Enable bulk actions" in the view config, returns to the list view, and asserts the Publish bulk button is no longer rendered.

#### `content-manager/cloning.spec.ts` — Document cloning

**Purpose:** Covers auto-clone of simple documents, cloning across locales, and the manual clone flow for entries that contain unique fields or relations.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.

**Scenarios covered:**

- `Cloning` -> `As a user I want to auto-clone a document`: duplicates an Author row via the list-view row actions and confirms the clone lands in edit view with Save disabled and Publish enabled, and that the list view shows two identical rows.
- `Cloning` -> `As a user I want to auto-clone a document in a different locale than the default one`: creates and publishes a Spanish Team entry, duplicates it from the list view, and confirms the cloned entry is editable in the same locale.
- `Cloning` -> `As a user I want to clone an entry with relations from the list-view`: duplicates an Article whose unique UID slug blocks auto-clone, fills a new slug in the resulting dialog, saves, and verifies the list view now contains two rows with the original title.

#### `content-manager/create-content.spec.ts` — Adding content (validation matrix)

**Purpose:** Exercises creating a Match entry with simple text and components, verifies component ordering, and asserts validation errors for a matrix of invalid inputs.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.
- Navigated to the Content Manager.

**Scenarios covered:**

- `Adding content` -> `I want to be able to save and publish content`: creates a Match with a valid opponent, saves, publishes, and verifies the persisted values.
- `Adding content` -> `I want to set component order when creating content`: adds Player and Variations dynamic-zone components, reorders them via drag-and-drop, saves, and asserts the new order.
- `Adding content` -> `when I publish empty required text field (basic) I see an error`: publishing with an empty required `opponent*` surfaces "This value is required".
- `Adding content` -> `when I publish invalid regexp text field (basic) I see an error`: publishing with a regex-violating opponent surfaces "The value does not match the regex".
- `Adding content` -> `when I publish empty required text field (single component) I see an error`: empty required field inside a single component produces the required-field error.
- `Adding content` -> `when I publish invalid regexp text field (single component) I see an error`: regex-violating text inside a single component produces the regex error.
- `Adding content` -> `when I publish empty required text field (repeatable component) I see an error`: empty required field inside a repeatable component produces the required-field error.
- `Adding content` -> `when I publish invalid regexp text field (repeatable component) I see an error`: regex-violating text inside a repeatable component produces the regex error.
- `Adding content` -> `when I publish empty required text field (dz component) I see an error`: empty required field inside a dynamic-zone component produces the required-field error.
- `Adding content` -> `when I publish invalid regexp text field (dz component) I see an error`: regex-violating text inside a dynamic-zone component produces the regex error.

#### `content-manager/date.spec.ts` — Date field entry

**Purpose:** Verifies the date picker accepts current, future, and ISO-formatted dates and persists them in MM/DD/YYYY format.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.
- Navigated to the Content Manager.

**Scenarios covered:**

- `Date field tests` -> `should select the current date from the UI datepicker`: selects today's date on a Match entry and asserts the saved input value.
- `Date field tests` -> `should select a future date by directly filling the input (skipping UI clicks)`: types a date one year in the future and asserts persistence.
- `Date field tests` -> `should handle an ISO-formatted date properly`: fills an ISO-derived MM/DD/YYYY date and asserts persistence.

#### `content-manager/decimal-field-hint.spec.ts` — Decimal field hints

**Purpose:** Ensures decimal number fields with min/max advanced settings render the correct hint text in the Content Manager edit view.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.

**Scenarios covered:**

- `Decimal field hint with min/max values` -> `should display correct hint for decimal field with min/max values in content manager`: adds a decimal `GDP` field with min 0/max 100 via the Content-Type Builder, opens a Country entry, and asserts the `min. 0 / max. 100` hint appears alongside the existing character-length hint. Cleans up by removing the field.

#### `content-manager/history.spec.ts` — Content history (EE)

**Purpose:** Validates the EE content history feature across collection and single types, including viewing versions, restoring, handling missing relations, and surfacing renamed fields as "Unknown fields".

**Preconditions:**

- EE edition enabled (`STRAPI_DISABLE_EE` is not `true`).
- `sharedSetup('history-spec', ...)` with login, file reset, `with-admin` import, and database reset run before every test.
- `afterAll` resets files.

**Scenarios covered:**

- `History` -> `A user should be able to restore a history version`: creates an entry, updates it, opens the history page, selects the earlier version, and restores it via the confirmation dialog.
- `History` -> `Collection Type` -> `A user should be able create, edit, or publish/unpublish an entry, navigate to the history page, and select versions to view from a list`: walks through creating French and English Article versions, then modifying and publishing the English one, asserting the history list shows correct counts, (current) badge, Draft/Published/Modified labels, and locale isolation.
- `History` -> `Collection Type` -> `A user should see the relations and whether some are missing`: creates an Author, attaches two authors to an Article, deletes one Author, then on the history page asserts the remaining relation is shown and a "missing relation" indicator is displayed for the deleted one.
- `History` -> `Collection Type` -> `A user should be able to rename (delete + create) a field in the content-type builder and see the changes as "unknown fields" in concerned history versions`: renames Article `title` in the Content-Type Builder, updates the entry, and confirms the older version in history displays the old field under "Unknown fields" with the new field flagged as "New field".
- `History` -> `Single Type` -> `A user should be able create, edit, or publish/unpublish an entry, navigate to the history page, and select versions to view from a list`: mirrors the collection-type flow on the Homepage single type across French/English locales, including publish and modified states.
- `History` -> `Single Type` -> `A user should see the relations and whether some are missing`: adds an authors relation to Homepage via the Content-Type Builder, links two authors, deletes one, and asserts the missing-relation alert in history.
- `History` -> `Single Type` -> `A user should be able to rename (delete + create) a field in the content-type builder and see the changes as "unknown fields" in concerned history versions`: renames Homepage `title`, updates the entry, and confirms the older version shows the old field as Unknown and the new field as New.

#### `content-manager/home-widgets.spec.ts` — Home page Content Manager widgets

**Purpose:** Validates the admin home page widgets for recently edited entries, recently published entries, locale handling, and the entries chart.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.

**Scenarios covered:**

- `Homepage - Content Manager Widgets` -> `a user should see the last edited entries`: edits a Product, returns to home, and asserts the modified entry is the top row of the last-edited widget with Draft status.
- `Homepage - Content Manager Widgets` -> `a user should see the last published entries`: publishes an Article and then modifies it, asserting the widget keeps the published snapshot while flipping its status between Published and Modified.
- `Homepage - Content Manager Widgets` -> `a user should see entries per locale in the last published entries widget`: publishes English and French Articles and confirms both locales appear in the widget.
- `Homepage - Content Manager Widgets` -> `a user should see the entries chart widget`: focuses arcs on the Entries chart, reads the tooltip's initial Draft count, publishes and modifies entries, and asserts the chart now shows Draft/Modified/Published segments with updated counts.

#### `content-manager/listview.spec.ts` — List view filtering, pagination and bulk actions

**Purpose:** Covers list-view filtering (including Status draft/published), pagination, and inline bulk publish/unpublish/delete flows.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.

**Scenarios covered:**

- `List View` -> `A user can filter entries`: filters Articles by `documentId` and confirms the grid narrows to the single matching row.
- `List View` -> `Status filter (Draft/Published)` -> `Status filter is available and filtering by Draft shows only draft entries`: filters Articles by Status = Draft and asserts two draft rows remain.
- `List View` -> `Status filter (Draft/Published)` -> `Filtering by Published shows only published entries`: publishes both Articles via the bulk dialog, applies Status = Published, and asserts the two published rows remain.
- `List View` -> `Status filter (Draft/Published)` -> `Filtering by Published when all are draft shows no content`: filters Articles by Status = Published while all remain draft, and asserts "No content found".
- `List View` -> `A user should be able to navigate to the ListView of the content manager and see some entries`: navigates to the Content Manager and confirms the Article list view renders with a Create new entry link.
- `List View` -> `Entries should be paginated`: lowers `pageSize` to 2 on the Author list and confirms expected rows per page plus Previous/Next enablement.
- `List View` -> `A user should be able to perform bulk actions on entries`: three sub-steps - `bulk publish` selects all and publishes via the modal, `bulk unpublish` selects all and unpublishes, and `bulk delete` selects all and deletes leaving the list empty.

#### `content-manager/preview.spec.ts` — Preview pane

**Purpose:** Verifies the preview feature for configured content types, including link copy, iframe URL construction, draft/published tabs, and publishing directly from preview.

**Preconditions:**

- Database reset and seeded with `with-admin` (with `coreStore: false`).
- Files reset.
- Logged in as admin on `/admin`.
- The EE `Advanced Preview` describe additionally requires EE edition.

**Scenarios covered:**

- `Preview` -> `Preview button should appear for configured content types`: opens an Article, uses Open preview, copies the preview link, closes the preview, and asserts the Open preview link becomes disabled with a tooltip once the form has unsaved changes.
- `Preview` -> `Preview button should not appear for content types without preview config`: opens a Product entry and asserts the Open preview link is absent.
- `Preview` -> `Tabs for Draft and Publish should be visible for content type with D&P enabled`: opens preview for an Article and asserts Draft and Published tabs render, with Published disabled while the document is a draft.
- `Preview` -> `Iframe should be present and load the correct URL`: publishes an Article, opens preview, and asserts the iframe `src` targets draft then published preview URLs when switching tabs.
- `Preview` -> `Publishing from preview with conditional fields should not trigger validation errors`: opens preview for an existing Article, publishes from within preview, and asserts no conditional-field validation toast is raised.
- `Advanced Preview` -> `I can edit the form to save the document as draft, modified, or published` (EE): from inside preview, edits and saves as draft, publishes, modifies to trigger Modified state, and asserts the confirmation dialog appears when switching tabs with unsaved changes.

#### `content-manager/uniqueness.spec.ts` — Uniqueness constraints

**Purpose:** Enforces uniqueness per document plus locale and publication-state dimensions for scalar, single-component, and repeatable-component fields.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.
- Navigated to the `Unique` collection type in the Content Manager.

**Scenarios covered:**

- `Uniqueness` -> `A user should not be able to duplicate the <fieldName> scalar field value in the same content type and dimensions (locale + publication state).`: generated for `uniqueString`, `uniqueNumber`, `uniqueEmail`, `uniqueDate`, and `UID` scalar fields. Creates a draft, publishes another entry with the same value, asserts "This attribute must be unique" on publish, then verifies the same value is allowed in a different locale (French). Skipped on WebKit due to a known bug.
- `Uniqueness` -> `A user should not be able to duplicate the <fieldName> single component field value in the same content type and dimensions (locale + publication state).`: same matrix applied to `ComponentTextShort`, `ComponentTextLong`, `ComponentNumberInteger`, `ComponentNumberFloat`, and `ComponentEmail` within a single (non-repeatable) component.
- `Uniqueness` -> `A user should not be able to duplicate the <fieldName> repeatable component field value in the same content type and dimensions (locale + publication state).`: same matrix applied to the same attributes inside a repeatable component, additionally asserting that two repeatable entries with identical unique values fail to publish with "2 errors occurred".

### edit-view

#### `content-manager/edit-view/boolean-clear-button.spec.ts` — Boolean clear button behaviour

**Purpose:** Validates when the "Clear" button is visible on boolean fields and that clearing persists a null value across save/reload.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.
- Navigated to the Content Manager.

**Scenarios covered:**

- `Boolean Component - Clear Button Functionality` -> `Clear button does NOT appear for required boolean fields`: toggles a required `isAvailable` boolean on Products through true/false and asserts the Clear button never appears.
- `Boolean Component - Clear Button Functionality` -> `Clear button appears only when not required and value is not null`: toggles `likesDogs` on Cat and asserts Clear is visible while a value is set and disappears after clearing to null.
- `Boolean Component - Clear Button Functionality` -> `Clear button sets value to null and persists after save`: sets `likesDogs` to true, clicks Clear, saves, reloads, reopens the entry, and asserts the checkbox is unchecked with no Clear button.

#### `content-manager/edit-view/collection-type-edit-view-errors.spec.ts` — Edit view error messages

**Purpose:** Asserts that publish validation errors are shown for unfilled required components and for permission-restricted required fields.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin (tests swap users as needed).

**Scenarios covered:**

- `Edit View` -> `Collection Type - Errors` -> `as a user I should see an error when trying to publish a document with a required component that is not filled in`: creates a Match with opponent but an empty required component and asserts the "There are validation errors..." toast on Publish.
- `Edit View` -> `Collection Type - Errors` -> `as a user without read permission for a required field, I should see an error when trying to publish`: creates a Product as super admin, removes the Editor role's read permission on `name`, logs in as Editor, attempts to publish, and asserts the permissions error message.

#### `content-manager/edit-view/collection-type-edit-view.spec.ts` — Collection type edit view

**Purpose:** Covers the core edit-view lifecycle for collection types: create, publish, save, modify, discard, unpublish, delete, plus draft-relation warnings.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.

**Scenarios covered:**

- `Edit View` -> `Collection Type` -> `as a user I want to be warned if I try to publish content that has draft relations` (fixme): currently skipped due to a known bug; intended to warn when publishing content with 1, 2, or 3 draft relations.
- `Edit View` -> `Collection Type` -> `as a user I want to create and publish a document at the same time, then modify and save that document.`: validates Draft/Published tab states, create-and-publish in one action, then modifies with a relation and saves, asserting Modified status.
- `Edit View` -> `Collection Type` -> `as a user I want to create a document, then modify that document`: creates an Article, verifies heading updates to `mainField`, edits blocks content and adds a draft relation, saves, and publishes with Ctrl+Enter; asserts list view reflects the new entry.
- `Edit View` -> `Collection Type` -> `as a user I want to be able to discard my changes`: publishes an Article, modifies the title, then uses "Discard changes" and confirms the discard toast.
- `Edit View` -> `Collection Type` -> `as a user I want to unpublish a document`: publishes an Article, unpublishes via More document actions, and asserts Published tab is disabled again.
- `Edit View` -> `Collection Type` -> `as a user I want to delete a document`: deletes an Article via More actions -> "Delete entry (all locales)" and confirms removal from the list view.

#### `content-manager/edit-view/enumeration-fields.spec.ts` — Enumeration fields

**Purpose:** Checks required vs optional enumeration fields, including their validation on publish and the ability to reset optional values.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.

**Scenarios covered:**

- `Edit View - Enumeration Fields Testing` -> `should test enumeration fields - required vs non-required behavior`: adds a required `hair` enumeration field to Cat via the Content-Type Builder, creates a Cat with no selection and asserts a validation error on publish, selects values for required and optional enums and publishes successfully, resets the optional enum via "Choose here", asserts the required enum's "Choose here" option is disabled, republishes, then cleans up by deleting the field.

#### `content-manager/edit-view/single-type-edit-view.spec.ts` — Single type edit view

**Purpose:** Mirrors the collection-type edit-view flows for single types (Homepage, Shop) and exercises adding components to a dynamic zone at specific positions.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.

**Scenarios covered:**

- `Edit View` -> `Single Type` -> `as a user I want to be warned if I try to publish content that has draft relations on components within a dynamic zone` (fixme): currently skipped; intended to show a draft-relation warning when publishing the Shop with draft relations inside a product-carousel component.
- `Edit View` -> `Single Type` -> `as a user I want to create and publish a document at the same time, then modify and save that document.`: on Homepage, creates, publishes, then modifies the content block and saves, asserting the Modified badge.
- `Edit View` -> `Single Type` -> `as a user I want to create a document, then modify that document`: on Homepage, creates and saves, updates blocks content, saves again, and confirms no Modified badge since no publish occurred.
- `Edit View` -> `Single Type` -> `as a user I want to be able to discard my changes`: on Shop, publishes, modifies the title, and discards via More document actions.
- `Edit View` -> `Single Type` -> `as a user I want to unpublish a document`: on Shop, publishes and then unpublishes, asserting the Published tab becomes disabled.
- `Edit View` -> `Single Type` -> `as a user I want to add a component to a dynamic zone at a specific position`: on the Shop dynamic zone, inserts components below, above, and between existing components, asserting the final ordered list.

### conditional-fields

#### `content-manager/conditional-fields/boolean-conditional-many-to-many-relation-visibility.spec.ts` — Boolean-controlled relation visibility

**Purpose:** Verifies that a boolean toggle can show or hide a many-to-many relation field.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.
- Navigated to the Content Manager.

**Scenarios covered:**

- `Conditional Fields - Boolean-controlled conditional many-to-many relation fields` -> `As a user I can toggle boolean fields to show/hide many-to-many relation fields`: on Dog with `likesCats = true`, asserts `bestFriendCats` is visible; toggles `likesCats` to false and asserts the relation field is hidden.

#### `content-manager/conditional-fields/boolean-conditional-select-relation.spec.ts` — Selecting a conditional relation

**Purpose:** Confirms that a relation visible only via a boolean condition can be populated and saved successfully.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.
- Navigated to the Content Manager.

**Scenarios covered:**

- `Conditional Fields - Boolean-controlled conditional relation fields and select relation` -> `As a user I can select relations in conditional fields and save them successfully`: creates a Cat "Whiskers", then creates a Dog "Luna" with `likesCats = true`, selects Whiskers in `bestFriendCats`, saves, and asserts the relation persists.

#### `content-manager/conditional-fields/boolean-conditional-text-field-visibility.spec.ts` — Boolean-controlled text field visibility

**Purpose:** Checks that toggling a controlling boolean hides conditional text fields and clears their stored value.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.
- Navigated to the Content Manager.

**Scenarios covered:**

- `Conditional Fields - Boolean-controlled conditional text fields` -> `As a user I can see that boolean fields control text field visibility and values are cleared when hidden`: on Products, fills `sku` with 5, toggles `isAvailable` to false to hide `sku`, saves, toggles back to true, and asserts `sku` is visible again but empty.

#### `content-manager/conditional-fields/enum-conditional-text-field-visibility.spec.ts` — Enum-controlled visibility and required conditional fields

**Purpose:** Validates enum-driven conditional text visibility, value clearing when hidden, and publish validation when only the visible branch of a required conditional pair is required.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.
- `afterAll` resets files.

**Scenarios covered:**

- `Conditional Fields - Enum-controlled conditional text fields and value are cleared when hidden` -> `As a user I can see that enum fields control text field visibility and values are cleared when hidden`: on Dog, creates with `personality = playful` and `favoriteToy = ball`, switches to `lazy` to hide `favoriteToy`, saves, switches back, and asserts the field is visible but cleared; refills and saves to confirm the new value persists.
- `Conditional Fields - Enum-controlled conditional text fields and value are cleared when hidden` -> `As a user I can publish an entry that has some hidden required conditional fields`: creates a `Link` component with `target` enum plus required `linkInternal`/`linkExternal` conditional on `target`, attaches it as a repeatable component on Article, publishes with `target = New window` and an empty `linkExternal` to assert the required error, switches target to `Same window` to hide `linkExternal` and show `linkInternal`, fills it, and publishes successfully.

### relations-on-the-fly

#### `content-manager/relations-on-the-fly/create-relation-and-publish.spec.ts` — Create and publish a relation inline

**Purpose:** Verifies that a new related document created from within a parent can be published and is reflected on the parent once the modal closes.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logs in as admin inside the test.

**Scenarios covered:**

- `Relations on the fly - Create a Relation and Save` -> `I want to create a new relation, publish the related document and check if the new relation is added to the parent document`: from an Article, opens the authors combobox, clicks "Create a relation", fills a name, publishes from within the modal, closes the modal, and asserts the new author appears on the parent Article.

#### `content-manager/relations-on-the-fly/create-relation-and-save.spec.ts` — Create and save a relation inline

**Purpose:** Verifies the same flow as the publish variant but saving the related document as a draft instead.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logs in as admin inside the test.

**Scenarios covered:**

- `Relations on the fly - Create a Relation and Save` -> `I want to create a new relation, save the related document and check if the new relation is added to the parent document`: creates an author inline from an Article, saves as draft, closes the modal, and asserts the Draft status and that the relation now shows on the parent.

#### `content-manager/relations-on-the-fly/create-relation-editor.spec.ts` — Editor permissions for inline relation creation

**Purpose:** Confirms a user without Create permission cannot use the "Create a relation" action.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as an Author user (`AUTHOR_EMAIL_ADDRESS` / `AUTHOR_PASSWORD`).

**Scenarios covered:**

- `Relations on the fly - Create a Relation` -> `I want to try to create a relation as an author without the permission to do it`: opens an Article and the authors combobox and asserts that the "Create a relation" option is disabled with `aria-disabled="true"`.

#### `content-manager/relations-on-the-fly/create-relation-in-component-and-save.spec.ts` — Create relation inside an existing component

**Purpose:** Covers creating a new related product directly from within an existing dynamic-zone component on a single type.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logs in as admin inside the test.

**Scenarios covered:**

- `Relations on the fly - Create a Relation inside a component and Save` -> `I want to create a relation inside a component, and save`: on the Shop single type, opens the existing Product carousel component, opens `products`, uses "Create a relation" to create a new Product, saves as draft, and asserts the modal switches to "Edit a relation" and the parent shows the new relation button.

#### `content-manager/relations-on-the-fly/create-relation-in-new-component-and-save.spec.ts` — Create relation inside a newly added component

**Purpose:** Same as the in-component flow but exercises adding a brand-new component to a dynamic zone and then creating a relation inside it.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logs in as admin inside the test.

**Scenarios covered:**

- `Relations on the fly - Create a Relation inside a new component and Save` -> `I want to create a relation inside a new component, and save`: on the Shop single type, adds a new Product carousel component, opens `products`, creates a relation inline, saves as draft, closes the modal, and asserts the new relation is shown on Shop.

#### `content-manager/relations-on-the-fly/create-relation.spec.ts` — Inline relation creation navigation and confirmations

**Purpose:** Covers navigation and unsaved-changes confirmations in the "Create a relation" modal, including going full-page, nesting relations, back navigation, and closing.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.

**Scenarios covered:**

- `Relations on the fly - Create a Relation` -> `I want to create a new relation in a modal and open it in full page`: opens "Create a relation" on an Article and clicks "Go to entry" to open the create view at its dedicated URL.
- `Relations on the fly - Create a Relation` -> `I want to click on a new relation in the create relation modal without saving the data in the form`: types a name then opens "Create a relation" nested on `articles`; confirmation prompt appears and, after confirming, the nested modal opens with Back disabled.
- `Relations on the fly - Create a Relation` -> `I want to add a new relation and edit it in the create relation modal without saving the data in the form`: types a name, selects an existing article to nest-edit, confirms the discard prompt, and lands in "Edit a relation" with Back disabled.
- `Relations on the fly - Create a Relation` -> `I want to click to close the relation modal without saving the data in the form`: types a name, clicks Close, confirms the prompt, and returns to the parent Article view.
- `Relations on the fly - Create a Relation` -> `I want to click the button to open the full page without saving the data in the form`: types a name, clicks "Go to entry", confirms the prompt, and navigates to the author create URL.
- `Relations on the fly - Create a Relation` -> `I want to click the back button to open the previous relation without saving the data in the form`: opens nested relations twice, starts a Create a relation, types a name, clicks Back, confirms the prompt, and lands on the previous relation.

#### `content-manager/relations-on-the-fly/edit-relation.spec.ts` — Editing existing relations in a modal

**Purpose:** Covers editing an existing relation in the modal, including save/publish, full-page navigation, nested blocks editor modals, nested-relation back navigation, and unsaved-change confirmations.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Logged in as admin.

**Scenarios covered:**

- `Relations on the fly - Edit a Relation` -> `I want to edit an existing relation in a modal and save and publish the related document`: renames Coach Beard via the relation modal on an Article, saves and publishes, and asserts the parent Article reflects the new name.
- `Relations on the fly - Edit a Relation` -> `I want to edit an existing relation in a modal and open it in full page`: uses "Go to entry" to jump from the relation modal to the author's edit URL.
- `Relations on the fly - Edit a Relation` -> `I want to open a blocks editor modal on top of a relation modal`: from an Author relation modal that contains a blocks editor, opens the blocks editor modal via Expand and closes it via Collapse.
- `Relations on the fly - Edit a Relation` -> `I want to open some nested relations and click the back button to open the initial relation`: opens nested relations twice, then walks back with the Back button and asserts Back becomes disabled at the first level.
- `Relations on the fly - Edit a Relation` -> `I want to click on a nested relation in the relation modal without saving the data in the form`: edits a name, clicks a nested relation, confirms the unsaved-change prompt, and lands on the nested relation.
- `Relations on the fly - Edit a Relation` -> `I want to click to close the relation modal without saving the data in the form`: edits a name, clicks Close, confirms the prompt, and returns to the Article edit view.
- `Relations on the fly - Edit a Relation` -> `I want to click the button to open the full page without saving the data in the form`: edits a name, clicks "Go to entry", confirms the prompt, and lands on the author edit URL.
- `Relations on the fly - Edit a Relation` -> `I want to click the back button to open the previous relation without saving the data in the form`: opens nested relations twice, edits the inner-most name, clicks Back, confirms the prompt, and lands on the intermediate relation.
- `Relations on the fly - Edit a Relation` -> `I want to open a relation inside a dynamic zone component, update its content, and save`: on Shop, opens the Product carousel component, selects a product, and opens the Edit a relation modal.
- `Relations on the fly - Edit a Relation` -> `I want to add a new relation in the edit view, open the relation and change its name, change is status and close the modal and see the changes reflected in the Edit view`: adds Led Tasso to an Article as draft, opens the relation modal, renames and publishes, closes the modal, and asserts the renamed, published relation is visible on the parent.
