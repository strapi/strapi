# Homepage Widget Customization

> Source: `tests/e2e/tests/admin/home-customization.spec.ts`

## User Story: See an empty state when no widgets are available to add

**As a** Strapi administrator **I want** the Add Widget modal to clearly state when no widgets are available **so that** I understand there is nothing more to add rather than seeing a broken or blank list.

### Acceptance Criteria

- **Given** I have logged in and the homepage greets me with "Hello test" **And** an "Add Widget" button is visible **When** I click "Add Widget" **Then** a widget selection modal (a dialog) opens **And** the modal shows the empty state text "No widgets available to add" (the API returns 0 widgets by default) **And** the modal can be dismissed with the "Cancel" button.

## User Story: Remove a widget and add it back via the modal

**As a** Strapi administrator **I want** to delete a widget from my homepage and re-add it later through the Add Widget modal **so that** I can tailor the homepage layout to my needs.

### Acceptance Criteria

- **Given** I have logged in, the homepage greets me with "Hello test", and the Profile widget is visible **When** I hover over the Profile widget **Then** its delete control is revealed.
- **Given** the Profile widget's delete control is revealed **When** I click the delete control **Then** the Profile widget is removed from the homepage.
- **Given** the Profile widget has been removed **When** I click "Add Widget" **Then** the widget selection modal opens **And** the removed Profile widget is offered in the modal as available to add.
- **Given** the removed Profile widget is offered in the modal **When** I click the Profile widget preview in the modal **Then** the modal closes **And** the Profile widget is restored on the homepage.
