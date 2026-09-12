# Edit a Component

> Source: `tests/e2e/tests/content-type-builder/components/edit-components.spec.ts`

Each scenario sets up a component "SomeComponent" (category "BlogPosts", icon "paint", with a "testtext" attribute) and embeds it via a component field "mycomponentname" in both a collection type ("Mycollectiontype") and a single type ("Singletypepage").

## User Story: Add an attribute to a component and see it propagate

**As a** Strapi developer **I want** an attribute added to a component to appear everywhere the component is used **so that** I can extend reusable structures consistently.

### Acceptance Criteria

- **Given** "SomeComponent" exists **When** the user adds a required text attribute "addedtext" (with regex `^(?!.*fail).*`) **Then** the attribute is added.
- **Given** the "addedtext" attribute has been added to "SomeComponent" **When** the user views the collection type "Mycollectiontype" **Then** the "addedtext" attribute is visible.
- **Given** the "addedtext" attribute has been added to "SomeComponent" **When** the user views the single type "Singletypepage" **Then** the "addedtext" attribute is visible.

## User Story: Remove an attribute from a component and see it propagate

**As a** Strapi developer **I want** removing an attribute from a component to remove it everywhere the component is used **so that** content types stay in sync with the component definition.

### Acceptance Criteria

- **Given** "SomeComponent" has a "testtext" attribute **When** the user views the collection type and the single type **Then** the "testtext" attribute is initially visible on both.
- **Given** the "testtext" attribute is removed from "SomeComponent" **When** the user views the collection type **Then** "testtext" is no longer visible.
- **Given** the "testtext" attribute is removed from "SomeComponent" **When** the user views the single type **Then** "testtext" is no longer visible.

## User Story: Delete a component and see it removed everywhere

**As a** Strapi developer **I want** deleting a component to remove it from all content types and from navigation **so that** no stale references remain.

### Acceptance Criteria

- **Given** "SomeComponent" is embedded via the component field "mycomponentname" **When** the user views the collection type and the single type **Then** the component field "mycomponentname" is initially visible on both **And** "SomeComponent" is initially visible as a link in the navigation.
- **Given** "SomeComponent" is deleted **When** the user views the collection type **Then** the component field is no longer visible.
- **Given** "SomeComponent" is deleted **When** the user views the single type **Then** the component field is no longer visible.
- **Given** "SomeComponent" is deleted **When** the user views the navigation **Then** it is no longer visible.
