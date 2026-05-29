# Transfer Tokens — Creation & Listing

> Source: `tests/e2e/tests/admin/transfer-tokens.spec.ts`

## User Story: Create transfer tokens with various durations and access types

**As a** Strapi administrator **I want** to create transfer tokens with different lifetimes and transfer permissions (push, pull, full access) **so that** I can authorize data transfers between Strapi instances in a controlled, time-limited way.

### Acceptance Criteria

- **Given** I navigate Settings → Transfer Tokens and click "Create new Transfer Token" **When** I fill in the token Name, select a Token duration, and select a Token type **And** I click Save **Then** the page shows text matching "copy this token" **And** an "Expiration date:" label is shown.
- **Given** I am on the Create Transfer Token page **When** I create a token with each of the following duration/type combinations **Then** each one is created successfully:
  - 30-day push token (duration "30 days", type "Push")
  - 30-day pull token (duration "30 days", type "Pull")
  - 30-day full-access token (duration "30 days", type "Full access")
  - 7-day token (duration "7 days", type "Full access")
  - 90-day token (duration "90 days", type "Full access")
  - unlimited token (duration "Unlimited", type "Full access")

## User Story: Created transfer tokens appear in the list with a creation time

**As a** Strapi administrator **I want** my created transfer tokens listed with a readable creation time **so that** I can identify and manage them.

### Acceptance Criteria

- **Given** I have created an unlimited full-access token named `my test token` **When** I navigate to Settings → Transfer Tokens **Then** the "Transfer Tokens" list page is shown **And** a row containing the text `my test token` is visible **And** that row shows a relative creation time matching a pattern like "N seconds ago" or "N minutes ago".
