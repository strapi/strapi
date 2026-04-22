---
sidebar_position: 10
sidebar_label: Settings
---

# Settings

End-to-end coverage for the Strapi admin Settings area, combining a navigation smoke test with a focused Role-Based Access Control (RBAC) suite that exercises role creation, editing, viewing, deletion, and assignment to users.

## Overview

The Settings specs verify that the Settings surface of the admin panel remains navigable across Community and Enterprise editions, and that the RBAC workflows an administrator relies on day-to-day behave correctly. Tests are organised into a top-level smoke test, a collection of single-purpose "action" specs under `rbac/actions/`, and a higher-level "scenario" spec under `rbac/scenarios/` that chains those actions into a realistic role lifecycle. All RBAC specs use the shared setup helper to reset the database, import the `with-admin` fixture, and log in as a Super Admin before each test.

## Test specs

### Root

#### `settings/smoke-test.spec.ts` — Settings navigation smoke test

**Purpose:** Confirm that every expected entry in the Settings navigation renders correctly, including Enterprise-only surfaces which must remain visible (as upsell pages) even in the Community edition.

**Preconditions:**

- Database reset and `with-admin` fixture imported.
- Navigate to `/admin` and log in as an administrator.
- The `STRAPI_DISABLE_EE` environment variable controls whether the Enterprise-only block runs.

**Scenarios covered:**

- `Settings` -> `every expected feature is displayed`: walks through Overview, API Tokens, Documentation, Internationalization, Media Library, Single Sign-On, Transfer Tokens, Webhooks, the Administration Panel's Roles and Users pages, the Users & Permissions Roles, Providers, Email templates, and Advanced settings pages, and finishes with Review Workflows and Audit Logs to confirm that EE features display their purchase page in CE.
- `Settings` -> `every EE feature is displayed` (EE only, gated by `describeOnCondition`): re-verifies that Review Workflows and Audit Logs are reachable when the Enterprise edition is enabled.

### rbac

The RBAC suite covers Strapi's Role-Based Access Control feature and ensures that administrators (or users with the appropriate privileges) can manage roles and permissions effectively. It is split into two groups: **actions**, which are individual tests that each focus on a single task (create, edit, view, delete, or assign a role), and **scenarios**, which combine several actions into a real-world workflow. Every spec logs in as a Super Admin after resetting the database and importing the `with-admin` fixture. See `tests/e2e/tests/settings/rbac/readme.md` for the canonical description of the suite's goals and steps.

### rbac/actions

#### `settings/rbac/actions/assign-role-to-user.spec.ts` — Assign a role to a user

**Purpose:** Verify that a Super Admin can change a user's role assignment, removing the previous role and applying a new one.

**Preconditions:**

- Shared setup (`rbac-assign-roles-to-user`) resets the database, imports `with-admin`, and logs in.
- Navigate to `Settings` -> `Administration Panel` -> `Users`.
- The fixture includes a user named "Editor Testing" with the `Editor` role.

**Scenarios covered:**

- `RBAC - Assign Role to Users` -> `Super Admin can assign a role to any user`: locates the target user, opens their edit view, unchecks the `Editor` role, checks the `Author` role, saves, and verifies the Users list reflects the new role while no longer showing the old one.

#### `settings/rbac/actions/create-role.spec.ts` — Create a role

**Purpose:** Validate that a Super Admin can create a new role with a custom name, description, and permissions.

**Preconditions:**

- Shared setup (`rbac-roles`) resets the database, imports `with-admin`, and logs in.
- Navigate to `Settings` -> `Administration Panel` -> `Roles`.

**Scenarios covered:**

- `RBAC - Create Roles` -> `Super Admin can create a new role`: clicks "Add new role", fills in the name `Publisher` and a description, opens the Collection Types tab and grants the `Publish article` permission, saves, then returns to the Roles list and asserts that the new row shows the expected name and description.

#### `settings/rbac/actions/delete-role.spec.ts` — Delete a role

**Purpose:** Confirm that a Super Admin can delete an existing role and that it disappears from the Roles list.

**Preconditions:**

- Shared setup (`rbac-roles`) resets the database, imports `with-admin`, and logs in.
- Navigate to `Settings` -> `Administration Panel` -> `Users` and delete the `author` user (confirming via the alert dialog) so that no user is still attached to the role under test.
- Navigate to `Settings` -> `Administration Panel` -> `Roles`.

**Scenarios covered:**

- `RBAC - Delete Roles` -> `Super Admin can delete an existing role`: locates the `Author` role row, clicks Delete, confirms the alert dialog, and asserts the `Author` row is no longer visible in the list.

#### `settings/rbac/actions/edit-role.spec.ts` — Edit a role

**Purpose:** Check that a Super Admin can rename an existing role, update its description, and amend its permissions.

**Preconditions:**

- Shared setup (`rbac-edit-roles`) resets the database, imports `with-admin`, and logs in.
- Navigate to `Settings` -> `Administration Panel` -> `Roles`.

**Scenarios covered:**

- `RBAC - Edit Roles` -> `Super Admin can edit an existing role`: opens the `Editor` role, renames it to `Contractor` with a new description, opens the Collection Types tab and unchecks Read, Publish, Update, and Delete article permissions, saves, and verifies the updated name and description are visible in the Roles list.

#### `settings/rbac/actions/see-role.spec.ts` — View a role

**Purpose:** Ensure that a Super Admin can open an existing role and see its name and description rendered accurately.

**Preconditions:**

- Shared setup (`rbac-see-roles`) resets the database, imports `with-admin`, and logs in.
- Navigate to `Settings` -> `Administration Panel` -> `Roles`.

**Scenarios covered:**

- `RBAC - See Roles` -> `Super Admin can see an existing role`: clicks the `Editor` role row and asserts that the Name field contains `Editor` and the Description field contains the expected editor description copy.

### rbac/scenarios

#### `settings/rbac/scenarios/create-new-role.scenario.spec.ts` — Full role management flow

**Purpose:** Exercise an end-to-end role lifecycle combining creation, assignment, editing, reassignment, and deletion to prove the Settings UI supports the full journey without intermediate state issues.

**Preconditions:**

- Shared setup (`rbac-full-role-flow`) resets the database, imports `with-admin`, and logs in.
- The fixture includes the user "Editor Testing" (`editor@testing.com`) initially assigned the `Editor` role.

**Scenarios covered:**

- `RBAC - Full Role Management Flow` -> `Administrator creates, assigns, and edits a role`: creates a `Publisher` role with the `Publish article` permission and verifies it in the Roles list; assigns `Publisher` to the `Editor Testing` user and verifies the Users list reflects the change; edits the `Publisher` role by toggling Read, Update, Create, Delete, and Publish article permissions and verifies the role still appears in the list; reverts the user back to the `Editor` role; then deletes the `Publisher` role and asserts it is no longer visible.
