# Guided Tour

> Source: `tests/e2e/tests/admin/guided-tour.spec.ts`

_These behaviors run only on the Community Edition (non-EE) build._

## User Story: Greeted with the Guided Tour Overview

**As a** new Strapi administrator **I want** a Guided Tour overview when I first arrive **so that** I understand the key steps to set up my application.

### Acceptance Criteria

- **Given** the guided tour is enabled **When** I log in and view the homepage **Then** a heading "Discover your application!" is shown **And** the overview lists the step "Create your schema" **And** the overview lists the step "Create and publish content" **And** the overview lists the step "Copy an API token" **And** the overview lists the step "Deploy your application to Strapi Cloud".

## User Story: Complete every guided tour step end to end

**As a** new Strapi administrator **I want** to walk through each guided tour (schema, content, API token, deploy) **so that** I learn the core workflow and see my progress tracked to 100%.

### Acceptance Criteria

**Content-Type Builder tour ("Create your schema")**

- **Given** the "Start" link for "Create your schema" is enabled **When** I click it **Then** I navigate to the Content-Type Builder **And** a "Welcome to the Content-Type Builder!" dialog is shown, then sequential popovers: "Collection Types", "Single Types", "Components", and "Your turn — Build something!".
- **Given** I am in the Content-Type Builder tour **When** I create a new collection type named "guided tour" and click Continue **Then** I reach the schema editor **And** an "Add a field to bring it to life" popover appears, which I dismiss with "Got it".
- **Given** I am in the schema editor **When** I add a Text field named "testField" and click Finish **Then** a "Don't leave without saving!" dialog appears, which I dismiss before Saving and waiting for the server restart.
- **Given** the schema has saved **When** a "First Step: Done! 🎉" dialog appears and I click Next **Then** I am routed to the Content Manager for `api::guided-tour.guided-tour`.
- **Given** I return to the homepage **When** I view the tour progress **Then** "Create your schema" shows "Done" **And** overall progress shows "25%".

**Content Manager tour ("Create and publish content")**

- **Given** I am on the homepage **When** I click "Start" **Then** a "Content Manager" dialog opens, then a "Create new entry" popover **And** a "Fields" popover and a "Publish" popover appear in sequence (dismissing Publish with "Got it").
- **Given** the Content Manager tour is in progress **When** I fill the Title with "Test" and Publish **Then** a "Time to setup API tokens!" dialog appears, and clicking Next routes to `/admin/settings/api-tokens`.
- **Given** I return to the homepage **When** I view the tour progress **Then** "Create and publish content" shows "Done" **And** progress shows "50%".

**API Tokens tour ("Copy an API token")**

- **Given** I am on the homepage **When** I click "Start" **Then** a "Last but not least, API tokens" dialog is shown, then a "Manage an API token" popover.
- **Given** the API Tokens tour is in progress **When** I edit the "Read Only" token **Then** a "View API token" dialog opens, dismissed with "Got it".
- **Given** I am viewing the "Read Only" token **When** I regenerate the token **Then** a "Copy your API token" dialog appears, which I dismiss before clicking Copy **And** a "Congratulations, it's time to deploy your application!" dialog appears, and clicking Next returns to `/admin`.
- **Given** I return to the homepage **When** I view the tour progress **Then** "Copy an API token" shows "Done" **And** progress shows "75%".

**Deploy step ("Deploy your application to Strapi Cloud")**

- **Given** I am on the homepage **When** I click "Read documentation" **Then** the Strapi Cloud step is marked as completed in storage **And** "Deploy your application to Strapi Cloud" shows "Done" **And** overall progress shows "100%".
