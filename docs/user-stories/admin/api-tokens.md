# API Tokens — Creation & Listing

> Source: `tests/e2e/tests/admin/api-tokens.spec.ts`

## User Story: Create API tokens with various durations and access types

**As a** Strapi administrator **I want** to create API tokens with different lifetimes and access levels **so that** I can grant external clients appropriately scoped, time-limited access to the Content API.

### Acceptance Criteria

- **Given** I navigate Settings → API Tokens → Create new API Token to reach the "Create API Token" page **When** I fill in the token Name, select a Token duration, and select a Token type **And** I click Save **Then** a "Copy" button becomes visible (the token is generated and shown once).
- **Given** I am on the Create API Token page **When** I create a token with each of the following duration/type combinations **Then** each one is created successfully:
  - 30-day Read-only token (duration "30 days", type "Read-only")
  - 30-day full-access token (duration "30 days", type "Full access")
  - 7-day token (duration "7 days", type "Full access")
  - 90-day token (duration "90 days", type "Full access")
  - unlimited token (duration "Unlimited", type "Full access")

## User Story: Created API tokens appear in the list

**As a** Strapi administrator **I want** my created API tokens listed **so that** I can locate and manage them afterwards.

### Acceptance Criteria

- **Given** I have created an unlimited full-access token named `my test token` **When** I navigate to Settings → API Tokens **Then** the "API Tokens" list page is shown **And** a grid cell with the exact name `my test token` is visible.
