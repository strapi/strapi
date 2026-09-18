# Create a Single Type with All Field Types

> Source: `tests/e2e/tests/content-type-builder/single-type/create-single-type.spec.ts`

## User Story: Create a single type covering every field type

**As a** Strapi developer **I want** to create a single type and add every available field type to it **so that** I can model any single-instance data shape the Content-Type Builder supports.

### Acceptance Criteria

- **Given** the Content-Type Builder is open **When** the user creates a single type named "Secret Document" (singular id `secret-document`) **Then** the single type is created end to end.
- **Given** the new single type is open **When** the user adds Text fields with advanced settings **Then** they can be configured with a required flag and a regex pattern (`^(?!.*fail).*`).
- **Given** the new single type is open **When** the user adds the scalar field types boolean, blocks, json, email, password, and markdown **Then** each can be added and marked required.
- **Given** the new single type is open **When** the user adds Number fields **Then** they can be added in integer, big integer, and decimal formats.
- **Given** the new single type is open **When** the user adds Date fields **Then** they can be added in date, time, and datetime formats.
- **Given** the new single type is open **When** the user adds Media fields **Then** they can be added for both single and multiple media.
- **Given** the new single type is open **When** the user adds Relation fields for the oneWay and manyWay types **Then** each can be added targeting the "Article" content type.
- **Given** the new single type is open **When** the user adds an enumeration field **Then** it can be added with the values first, second, and third.
- **Given** the new single type is open **When** the user adds a new single (non-repeatable) component in a newly created category ("testcategory") **Then** it can be added with its own text attribute and icon.
- **Given** the "testcategory" category exists **When** the user adds a new repeatable component **Then** it can be added in the existing "testcategory" category.
- **Given** an existing component is available **When** the user reuses it **Then** it can be added under an existing category.
- **Given** the new single type is open **When** the user adds a dynamic zone containing a newly created component (with its own category, icon, and text attribute) **Then** the dynamic zone can be added.
