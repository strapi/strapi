# Test Suite for Role-Based Access Control

This test suite focuses on Strapi's Role-Based Access Control (RBAC) feature.

The tests ensure that administrators or users with appropriate privileges can manage roles and permissions effectively.

## Test Scenarios

The test scenarios are organized into two distinct groups: one dedicated to actions (individual tests focusing on
specific tasks) and another for scenarios (combinations of multiple actions to simulate real-world workflows).

---

### 1. **Assign Role to Users**

#### File: [`assign-role-to-user.spec.ts`](./actions/assign-role-to-user.spec.ts)

**Type:**
Action

**Goal:**
Ensure that the Super Admin can assign, remove, or update roles for users effectively.

**Test Steps:**

- Log in as a Super Admin and navigate to the Users management page.
- Select a user (Editor role) from the list and open their edit page.
- Remove the current role (`Editor`) and assign a new role (`Author`).
- Save the changes and navigate back to the Users management page.
- Verify that the user now has the updated role (`Author`) and that the old role (`Editor`) is removed.

---

### 2. **Delete Roles**

#### File: [`delete-role.spec.ts`](./actions/delete-role.spec.ts)

**Type:**
Action

**Goal:**
To validate that the Super Admin can delete an existing role successfully.

**Test Steps:**

- Log in as a Super Admin and navigate to the Roles management page.
- Identify the role to be deleted (for example, `Author`).
- Click on the delete button and confirm the deletion in the alert dialog.
- Verify that the role no longer appears in the list of roles.

---

### 3. **Edit Roles**

#### File: [`edit-role.spec.ts`](./actions/edit-role.spec.ts)

**Type:**
Action

**Goal:**
To verify that the Super Admin can edit the details and permissions of an existing role.

**Test Steps:**

- Log in as a Super Admin and navigate to the Roles management page.
- Select a role to edit (`Editor`) and modify its name, description, and permissions.
- Add or remove specific permissions (for example, disabling 'Update', 'Publish', and 'Delete article' permissions).
- Save the modifications and verify the changes by navigating back to the Roles page.

---

### 4. **See Roles**

#### File: [`see-role.spec.ts`](./actions/see-role.spec.ts)

**Type:**
Action

**Goal:**
To confirm that the Super Admin can view the details of an existing role, including its name, description, and
permissions.

**Test Steps:**

- Log in as a Super Admin and navigate to the Roles management page.
- Select an existing role (for example, `Editor`) to view its details.
- Verify that the role's name and description are displayed accurately.

---

### 5. **Create Roles**

#### File: [`create-role.spec.ts`](./actions/create-role.spec.ts)

**Type:**
Action

**Goal:**
To validate that the Super Admin can create a new role with customized permissions.

**Test Steps:**

- Log in as a Super Admin and navigate to the Roles management page.
- Click the "Add new role" button to open the role creation form.
- Fill in the role's name (for example, `Publisher`) and description.
- Assign specific permissions (for example, allow the `Publish article` permission).
- Save the newly created role and verify that it appears in the list.

---

### 6. **Full Role Management Flow**

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
