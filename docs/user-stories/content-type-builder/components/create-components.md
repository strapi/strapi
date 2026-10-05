# Create a Component

> Source: `tests/e2e/tests/content-type-builder/components/create-components.spec.ts`

## User Story: Create a component in a new category

**As a** Strapi developer **I want** to create a component and place it in a newly created category **so that** I can organize reusable components.

### Acceptance Criteria

- **Given** the Content-Type Builder is open **When** the user creates a component "TestNewComponent" in a new category "BlogPosts" with the "paint" icon and a single text attribute ("sometextfield") **Then** the component is created.

## User Story: Create a component covering every field type

**As a** Strapi developer **I want** to create a component containing every available field type **so that** components can model any reusable data shape the builder supports.

### Acceptance Criteria

- **Given** the Content-Type Builder is open **When** the user creates a component "ArticlesComponent" in the existing "product" category with the "paint" icon **Then** the component is created.
- **Given** the "ArticlesComponent" component is open **When** the user adds Text fields with advanced settings **Then** they can be configured with a required flag and a regex pattern (`^(?!.*fail).*`).
- **Given** the component is open **When** the user adds the scalar field types boolean, blocks, json, email, password, and markdown **Then** each can be added and marked required.
- **Given** the component is open **When** the user adds Number fields **Then** they can be added in integer, big integer, and decimal formats.
- **Given** the component is open **When** the user adds Date fields **Then** they can be added in date, time, and datetime formats.
- **Given** the component is open **When** the user adds Media fields **Then** they can be added for both single and multiple media.
- **Given** the component is open **When** the user adds Relation fields for the oneWay and manyWay types **Then** each can be added targeting the "Article" content type.
- **Given** the component is open **When** the user adds an enumeration field **Then** it can be added with the values first, second, and third.
- **Given** the component is open **When** the user adds a nested new single component in a newly created category ("testcategory") **Then** it can be added with its own text attribute.
- **Given** the "testcategory" category exists **When** the user adds a nested new repeatable component **Then** it can be added in the existing "testcategory" category.
- **Given** an existing component is available **When** the user reuses it **Then** it can be nested under an existing category.
