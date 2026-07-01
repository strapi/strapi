# Admin Tokens — Creation, Listing, Ownership & Permission Ceiling

> Source: `tests/e2e/tests/admin/admin-tokens.spec.ts`

## User Story: Create an admin token with a chosen duration

**As a** Strapi administrator **I want** to create an admin token with a defined lifetime (e.g. 30 days) **so that** I can authenticate against admin APIs for a controlled period.

### Acceptance Criteria

- **Given** I navigate Settings → Admin Tokens → Create new Admin Token to reach the "Create Admin Token" page **When** I fill in the token Name **And** I select a token duration of "30 days" **And** I click Save **Then** a "Copy" button becomes visible (the token has been generated and is shown once).

## User Story: Created admin tokens appear in the list

**As a** Strapi administrator **I want** my created admin tokens listed **so that** I can find and manage them later.

### Acceptance Criteria

- **Given** I have created a token named `my-list-test-token` **When** I navigate to Settings → Admin Tokens **Then** the "Admin Tokens" list page is shown **And** a grid cell with the exact token name `my-list-test-token` is visible in the list.

## User Story: Admin tokens have no Content-API token type selector

**As a** Strapi administrator **I want** the admin token creation form to omit the Content-API "Token type" selector **so that** the form reflects that admin tokens use the admin permissions matrix, not Content-API access levels.

### Acceptance Criteria

- **Given** I am on the Create Admin Token page **When** I view the form **Then** the "Token type" field is not visible.

## User Story: Admin token creation uses the admin permissions matrix

**As a** Strapi administrator **I want** to assign granular admin permissions (including a Plugins tab) when creating an admin token **so that** the token's scope mirrors the admin permission model.

### Acceptance Criteria

- **Given** I am on the Create Admin Token page **When** I view the permissions matrix **Then** a "Plugins" tab is visible **And** the Content-API style "Token type" selector (Read-only / Full access / Custom) is not visible.

## User Story: Token owners do not see an Owner field on their own token

**As a** token owner **I want** the Owner field hidden when I view a token I created **so that** the UI stays uncluttered for my own tokens.

### Acceptance Criteria

- **Given** I have created my own admin token **When** I view the token edit view **Then** the "Owner" field is not visible.

## User Story: Non-owners see Owner info but cannot copy or regenerate

**As a** super admin viewing a token owned by another user (an editor) **I want** to see who owns it but be prevented from copying or regenerating it **so that** ownership boundaries are respected.

### Acceptance Criteria

- **Given** an editor (granted admin-token permissions) has created a token named `editor-owned-token` **When** a super admin opens that editor-owned token from the Admin Tokens list **Then** the "Owner" text is visible **And** the "Copy" button is not visible **And** the "Regenerate" button is not visible.

## User Story: Owners can regenerate and copy their token

**As a** token owner (editor) **I want** Regenerate and Copy actions on a token I own **so that** I can manage my own credentials.

### Acceptance Criteria

- **Given** an editor creates `editor-own-regen-token` **When** the resulting edit page is shown **Then** the "Regenerate" button is visible **And** the "Copy" button is visible.

## User Story: Super admin has no permission ceiling

**As a** super admin **I want** every Settings permission checkbox enabled when creating an admin token **so that** I can grant any permission without restriction.

### Acceptance Criteria

- **Given** I am a super admin **When** I navigate to Create Admin Token **Then** a successful GET to `/admin/permissions` is triggered and completes **And** there are zero disabled checkboxes on the page.

## User Story: Editors are limited by their own permission ceiling

**As an** editor with limited permissions **I want** the admin token form to disable permissions I do not hold **so that** I cannot grant a token more access than I have.

### Acceptance Criteria

- **Given** I have switched to the editor **When** I open Create Admin Token **Then** the "Select Create article" checkbox is enabled **And** the "Select Read article permission" checkbox is enabled **And** the "Select Update article" checkbox is enabled **And** the "Select Delete article" checkbox is disabled (the editor lacks that permission).

## User Story: Super admin editing an editor's token sees the editor's ceiling

**As a** super admin editing a token created by an editor **I want** the form to reflect the editor's permission ceiling **so that** the token cannot be elevated beyond what its owner could grant.

### Acceptance Criteria

- **Given** an editor creates `editor-ceiling-token` **When** the super admin opens that token from the Admin Tokens list **Then** at least one disabled checkbox is visible (the editor's ceiling is applied).
