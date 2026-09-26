# Content-Type Builder Guided Tour (AI Chat)

> Source: `tests/e2e/tests/content-type-builder/guided-tour.spec.ts`

## User Story: See the AI-enabled Content-Type Builder guided tour

**As a** Strapi developer **I want** a guided tour that introduces the Content-Type Builder and opens the AI chat **so that** I can get started building my schema with AI assistance.

### Acceptance Criteria

- This behavior is only available in the Enterprise Edition (EE) and runs with the guided tour enabled.
- **Given** the guided tour is enabled (EE only) **When** the user starts the "Create your schema" guided tour step **Then** a "Welcome to the Content-Type Builder!" dialog is shown.
- **Given** the "cms-ai" feature is enabled and the welcome dialog is shown **When** the user clicks "Next" **Then** a "Time to get started!" dialog is shown.
- **Given** the "Time to get started!" dialog is shown **When** the user clicks "Next" again **Then** the AI chat opens, shown by the "Ask Strapi AI..." textbox becoming visible.
