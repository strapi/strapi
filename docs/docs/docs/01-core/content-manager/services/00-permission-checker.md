# Permission Checker

## Overview

The **Permission Checker** is a service in Strapi that helps enforce access control policies by verifying user permissions for various actions on content entities. It provides methods to check, sanitize, and validate user actions based on their permissions.

## Features

- **Permission Checking**: Verify whether a user has the necessary permissions for a specific action.
- **Sanitization**: Remove unauthorized fields from input and output data.
- **Validation**: Ensure that queries and input data comply with permission rules.
- **Query Enforcement**: Modify queries to include permission constraints automatically.

## Actions Supported

The service defines the following actions:

```ts
const ACTIONS = {
  read: 'plugin::content-manager.explorer.read',
  create: 'plugin::content-manager.explorer.create',
  update: 'plugin::content-manager.explorer.update',
  delete: 'plugin::content-manager.explorer.delete',
  publish: 'plugin::content-manager.explorer.publish',
  unpublish: 'plugin::content-manager.explorer.publish',
  discard: 'plugin::content-manager.explorer.update',
} as const;
```

## Usage

### Instantiating the Permission Checker

To use the permission checker, retrieve it from the **content-manager** plugin:

```ts
const permissionChecker = strapi
  .plugin('content-manager')
  .service('permission-checker')
  .create({ userAbility, model });
```

- `userAbility`: The user's ability object containing their permissions. Accessed on the request context object: `ctx.state.userAbility`
- `model`: The content type model for which permissions are checked.

### Checking Permissions

#### `can.<action>()`

Determines if the user **has** permission to perform a specific action.

```ts
if (permissionChecker.can.create()) {
  console.log('User can create content');
}
```

#### `cannot.<action>()`

Determines if the user **does not** have permission to perform a specific action.

```ts
if (permissionChecker.cannot.delete()) {
  throw new errors.ForbiddenError('User is not allowed to delete content');
}
```

### Sanitization Methods

#### `sanitizeOutput(data, { action })`

Cleans output data based on permissions.

```ts
const sanitizedData = permissionChecker.sanitizeOutput(entity);
```

#### `sanitizeQuery(query, { action })`

Cleans a query before execution.

```ts
const safeQuery = permissionChecker.sanitizeQuery({ page: '1', pageSize: '10' });
```

#### `sanitizeInput(action, data, entity)`

Cleans input data before saving.

```ts
const sanitizedInput = permissionChecker.sanitizeInput('create', inputData);
```

#### `sanitizeCreateInput(data)`

Shortcut for sanitizing create input.

```ts
const sanitizedCreateData = permissionChecker.sanitizeCreateInput(inputData);
```

#### `sanitizeUpdateInput(entity) => (data)`

Shortcut for sanitizing update input.

```ts
const sanitizedUpdateData = permissionChecker.sanitizeUpdateInput(existingEntity)(inputData);
```

### Validation Methods

#### `validateQuery(query, { action })`

Ensures a query is valid based on permissions.

```ts
const validatedQuery = permissionChecker.validateQuery({ page: '1', pageSize: '10' });
```

#### `validateInput(action, data, entity)`

Ensures input data is valid before saving.

```ts
permissionChecker.validateInput('update', inputData, existingEntity);
```

### Query Enforcement

#### `sanitizedQuery.<action>(query)`

Modifies queries to enforce permissions automatically.

```ts
const securedQuery = permissionChecker.sanitizedQuery.read({ sort: 'createdAt:desc' });
```

## Exported Service

```ts
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  create: createPermissionChecker(strapi),
});
```

## Example Usage in Strapi

```ts
const canCreate = strapi.plugin('content-manager').service('permission-checker').can.create();
if (!canCreate) {
  throw new errors.ForbiddenError('User does not have permission to create content');
}
```
