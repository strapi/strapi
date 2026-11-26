# Test Suite for Role-Based Access Control

This test suite focuses on Strapi's Role-Based Access Control (RBAC) feature.

The tests ensure that administrators or users with appropriate privileges can manage roles and permissions effectively.

## Test Scenarios

The scenarios here combine several actions to simulate real-world workflows. The single-action tests (see, create,
edit, delete a role, assign a role to a user) moved to the new UI suite:
[`tests-next/ui/tests/settings/rbac`](../../../../../tests-next/ui/tests/settings/rbac).

---

### 1. **Full Role Management Flow**

#### File: [`create-new-role.scenario.spec.ts`](./scenarios/create-new-role.scenario.spec.ts)

**Type:**
Scenario

**Goal:**
To cover a comprehensive end-to-end flow combining creating, editing, assigning, and deleting roles to ensure the system supports a complete lifecycle of role management.

**Test Steps:**

- Create a new role (`Publisher`) and assign permissions.
- Verify the new role appears in the Roles list.
- Assign the new role to a user.
- Edit the role's permissions and verify the changes in the list.
- Revert the user to their previously assigned role.
- Delete the newly created role and verify that it has been successfully removed.
