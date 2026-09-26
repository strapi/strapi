# Content Type UID Generation

> Source: `tests/e2e/tests/content-type-builder/collection-type/uid-generation.spec.ts`

## User Story: Generate the UID from the singular name, not the display name

**As a** Strapi developer **I want** a content type's UID to be derived from its singular API ID **so that** the API path matches the singular name I chose rather than the display name.

### Acceptance Criteria

- **Given** the Content-Type Builder is open **When** the user creates a new collection type **Then** a "Create a collection type" modal opens.
- **Given** the "Create a collection type" modal is open **When** the user enters a display name of "Members" **Then** the API IDs are auto-generated after a short delay.
- **Given** the API IDs have been auto-generated **When** the user manually changes the singular API ID to "member" **Then** it retains that value **And** the plural API ID is "members".
- **Given** singular "member" and plural "members" are set **When** the user continues, adds a Text field named "title", saves, and the server restarts **Then** the "Members" content type appears in the list.
- **Given** the "Members" content type exists **When** the user opens it **Then** the URL ends with `content-types/api::member.member`, confirming the UID uses the singular name "member" rather than "members".

## User Story: Block creation when singular and plural names are identical

**As a** Strapi developer **I want** validation that prevents identical singular and plural API IDs **so that** I cannot create an invalid content type.

### Acceptance Criteria

- **Given** the "Create a collection type" modal is open **When** the user enters "Cities" as the display name **Then** the singular API ID is auto-generated as "cities" (slugified, not singularized) **And** the plural API ID is also "cities".
- **Given** the singular and plural API IDs are both "cities" **When** the user clicks "Continue" **Then** continuing is blocked **And** the validation errors "This value cannot be the same as the plural one" and "This value cannot be the same as the singular one" are shown **And** the user remains on the "Create a collection type" modal.
- **Given** the names are identical **When** the user corrects the singular API ID to "city" **Then** continuing to the field-addition screen is allowed ("Add new field" becomes visible).
- **Given** the field-addition screen is shown **When** the user adds a Text field named "name", saves, and the server restarts **Then** the "Cities" content type appears in the list **And** its URL ends with `content-types/api::city.city`.
