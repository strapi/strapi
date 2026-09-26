# Collection Type Edit View - Validation and Permission Errors

> Source: `tests/e2e/tests/content-manager/edit-view/collection-type-edit-view-errors.spec.ts`

## User Story: See a validation error when publishing with an unfilled required component

**As a** content editor **I want** to be blocked with a validation error when I try to publish a document whose required component is not filled in **so that** I do not publish incomplete content.

### Acceptance Criteria

**Scenario: Publishing with an empty required component shows a validation error**

- **Given** I am creating a `Match` entry with the `opponent` field filled with "Test" but a required component left empty
- **When** I click "Publish"
- **Then** the error "There are validation errors in your document. Please fix them before saving." is displayed

## User Story: See a permission error when a required field is not readable

**As a** content editor (Editor role) without read permission on a required field **I want** to be informed that my permissions block publishing **so that** I know to request access from an administrator.

### Acceptance Criteria

**Scenario: Editor without read access to a required field is blocked from publishing**

- **Given** a super admin creates and saves a draft `Products` entry with `slug` "product-for-required-test", confirmed by a "Saved Document" message
- **And** the super admin removes the Editor role's Read permission for the `name` field of the Product content type and saves it, confirmed by a "Saved" message
- **When** I log in as an Editor, open that product, and click "Publish"
- **Then** the error "Your current permissions prevent access to certain required fields. Please request access from an administrator to proceed." is displayed
