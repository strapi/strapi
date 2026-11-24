---
title: '@strapi/permissions'
sidebar_label: 'permissions'
description: 'Permission engine built on CASL. It takes action and condition providers and generates abilities from a list of permissions.'
package: '@strapi/permissions'
status: draft
review_notes:
  - The last sentence of Purpose, the pointer to the Permission engine page in Key concepts, the `providerFactory` import in the integration example, and Related are new. They were written from the package source on develop and need a maintainer review. The other text is moved from the previous page.
---

## Purpose

The `@strapi/permissions` package is a sophisticated permission management system designed to provide flexible, granular
control over access rights in Strapi systems.

Built on top of CASL's ability system, it extends the basic permission model with advanced features like parametrized
actions, conditional evaluation, and a hook system for custom behaviors.

It serves as the backbone for building advanced implementations in Strapi, enabling developers to design customized
permission systems tailored to specific Strapi business objectives and application demands like RBAC, users and permissions, or API tokens.

The package runs on the server. Admin RBAC, transfer tokens and the Content API permissions each create their own engine from it.

## Key concepts

The [Permission engine](./01-engine.md) page covers the hook order, the engine options and the custom ability builder in detail.

### Engine

```mermaid
graph TB
  B[/Action Provider/]:::provider --> A([Permission Engine]):::engine
  C[/Condition Provider/]:::provider --> A
  A --> D{{Hook System}}:::hookSystem
  A --> E([Ability Generator]):::generator
  D --> H([Lifecycle Hooks]):::lifecycle
  E --> I([CASL Integration]):::integration
  H --> N([Permission Validation]):::hook
  H --> O([Permission Formatting]):::hook
  H --> P([Permission Evaluation]):::hook
```

### Domain

```mermaid
graph TB
  N([Domain]):::namespace --> A([Permission]):::permission
  A --> B([Action]):::action
  A --> C([Subject]):::subject
  A --> D([Conditions]):::conditions
  A --> E([Properties]):::properties
  A --> F([ActionParameters]):::actionParameters
```

### Dynamic evaluation

Runtime permission checking at the time of the request, ensuring that permissions align with the most current context
and data.

_Example Use Case_: API endpoint access control, where user roles and data states impact access decisions dynamically.

### Parametrized actions

Actions that leverage context-specific parameters to enable fine-grained control, allowing flexibility in defining
permissions.

_Example Use Case_: `publish?postId=123`, restricting operation to a specific post identified by its ID.

### Conditional logic

Implementation of complex permission rules that consider different conditions, enabling nuanced access control tailored
to resource state or user data.

_Example Use Case_: Validate resource ownership by checking if the requesting user is the owner of a specific resource.

### Hook system

A modular mechanism to inject custom behaviors during various stages of the permission validation process, offering
extensibility and adaptability.

_Example Use Case_: Implement audit logging for permission evaluations or perform additional data validation before
granting access.

### Integration example

```typescript
import { engine, domain } from '@strapi/permissions';
import { providerFactory } from '@strapi/utils';

// 1. Define Providers
const providers = {
  action: providerFactory(),
  condition: providerFactory(),
};

// 2. Register Custom Conditions
providers.condition.register({
  name: 'isOwner',
  handler: (ctx) => ctx.user.id === ctx.resource.ownerId,
});

// 3. Create Engine
const permissionEngine = engine.new({ providers });

// 4. Define Permissions
const permissions = [
  domain.permission.create({
    action: 'read',
    subject: 'article',
    conditions: ['isPublished'],
  }),
  domain.permission.create({
    action: 'update',
    subject: 'article',
    conditions: ['isOwner'],
    properties: {
      fields: ['title', 'content'],
    },
  }),
];

// 5. Generate Ability
const ability = await permissionEngine.generateAbility(permissions);

// 6. Evaluate Permission
const canReadArticle = ability.can('read', 'article');
```

## Related

- [Permission engine](./01-engine.md): hook order, engine options and the custom ability builder.
- [`@strapi/admin` permissions](../admin/permissions/00-intro.mdx): the admin RBAC system that builds on this engine.
- [`@strapi/core`](../core/index.md): creates the engine for the Content API permissions.
- [`@strapi/utils`](../utils/index.md): provides `providerFactory` and the hook helpers that the engine uses.
- [Authentication](../../../architecture/08-authentication.md): sessions and JWT, the step before an engine checks permissions.
