---
title: Typescript
---

# Development Guidelines

This document provides guidelines for developing on the Strapi codebase using TypeScript. It covers various topics, including types location, generics, breaking changes, factories and more.

## 1. Type Location

When working with types on the Strapi codebase, it is essential to consider the location of types. These are the three common approaches and situations we document:

### a. Colocation

In the colocation approach, type definitions are colocated with the corresponding code. This means that types are defined in the same file or module where they are used.

**This approach is suitable when the types are specific to a particular module**.

_Note: In some situations, colocated types can still be exported if needed by other modules (e.g. React Component Props)_

Example:

```typescript
// config.ts

interface Config {
  prop1: string;
  prop2: number;
}

function update(config: Config): Config {
  // ...
}
```

```typescript
// Box.tsx

import * as React from 'react';

export interface TaskProps {
  name: string;
  priority: 'high' | 'medium' | 'low';
  due: Date;
}

export const TaskProps = ({ name, priority, due }: TaskProps) => {
  // ...
};
```

### b. Definitions Files

**When types are shared across multiple files or modules, or when dealing with types that does not belong to a specific module**, it is recommended to use definition files (`.d.ts`) to separate type declarations from their usage.

Definitions files provide a centralized location for types, making it easier to maintain and reuse them.

Example:

```typescript
// service.d.ts
interface CommonService {
  [key: keyof any]: unknown;
}

// users.ts
const usersService: CommonService = {
  // ...
};

// books.ts
const booksService: CommonService = {
  // ...
};
```

### c. Utils

**For type utilities used across different packages**, it is mandatory to place them in their related module's definition file (.d.ts).

- Strapi utils **must** be placed in `@strapi/strapi`'s types module
- Packages' specific utils **must** be placed in their respective types' module

Basically, utility modules contain reusable type definitions that can be imported wherever needed. This approach promotes code reusability and separation of concerns.

Example:

```typescript
// core/uid.d.ts
export type Admin = `admin::${string}`;

// admin.ts
import type { UID } from '@strapi/strapi';

function getService(uid: UID.Admin): object {
  // ...
}
```

Choose the appropriate approach based on the size and complexity of your feature and the level of reusability of the types.

## 2. Modules, Imports and Exports

### a. Modules

In TypeScript, modules can be used to organize and encapsulate related types and code. Modules provide a way to mimic namespaces and avoid polluting the global scope with numerous type declarations. By grouping related types within modules, it is possible to improve code organization and make it easier to navigate and understand the codebase.

This is especially true when working with packages exports or utilities, where the exported components needs to be scoped.

Example:

```typescript
// service.d.ts
export type Admin = Record<string, any>;

// uid.d.ts
export type Admin = `admin::${string}`;

// index.d.ts
export * as Service from './service';
export * as UID from './uid';

// src/index.ts
import type { Service, UID } from './index';

type AdminService = Record<UID.Admin, Service.Admin>;
```

### b. Imports

When importing **only types** from a module, `import type` must be used.

The `import type` syntax imports only the types and eliminates the runtime impact of importing the actual values. This helps reduce the bundle size and improves performance by avoiding unnecessary code execution.

Example:

```typescript
// ❌ don't

import { Attribute, Common } from '@strapi/strapi';

// ✅ do

import type { Attribute, Common } from '@strapi/strapi';
```

When importing **both types and implementations** from a module:

- `import type` must be used for types
- `import` must be used for the rest

Example:

```typescript
// ❌ don't

import { User, findUser } from './user';

const user: User = findUser();

// ✅ do

import type { User } from './user';
import { findUser } from './user';

const user: User = findUser();
```

### c. Exports

In most cases, it is recommended to use named exports (`export`) instead of the default export (`export default`). Named exports provide more flexibility and clarity when importing and using modules. They allow importing specific members of a module explicitly, which improves code readability and maintainability.

However, there are a few exceptions where using export default might be appropriate. For example, when exporting a single primary entity or class from a module, or when working with modules that have a natural default export, such as a configuration object.

Using regular exports provides a clearer and more explicit interface for module consumers, promoting better code organization and maintainability. However, it is important to consider the context before deciding whether to use default exports.

## 3. Parameters for Generics

When working with generic types, it is required to follow naming conventions and use descriptive names for type parameters. This helps improve code readability and maintainability over the whole codebase.

- For simple types with a single self-explanatory parameter, it is allowed to **use `T`**
- For any other generic types' parameters, it is required to **use a meaningful PascalCased variable name prefixed by `T`**

Example:

```typescript
// ❌ don't
function query<T extends object, U extends keyof T>(data: T, properties: U[]): { [K in U]: T[K] } {
  // ...
}

// ✅ do
function query<TValue extends object, TKey extends keyof TValue>(
  data: TValue,
  properties: TKey[]
): { [TIter in TKey]: TValue[TIter] } {
  // ...
}

// ❌ avoid
type NonEmpty<TValue extends string> = TValue extends '' ? never : TValue;

// ✅ prefer
type NonEmpty<T extends string> = T extends '' ? never : T;
```

Choose meaningful names for type parameters that accurately describe their purpose within the context of the function or type.

## 4. Avoiding Breaking Changes for Users

When making changes to the Strapi types, it is important to consider the impact on existing users. To avoid breaking changes, follow these guidelines:

- **Avoid removing or changing public APIs:** Public types APIs include functions, classes, or interfaces/types exposed to users as part of the official/documented Strapi API. Removing or changing them without providing appropriate deprecations or migration paths can break users' existing code.
- **Use deprecation warnings instead:** If you need to deprecate an existing API, provide deprecation warnings and suggest alternative approaches. Give users a reasonable amount of time to adapt their code to the changes.
- **Release breaking changes in major versions:** Breaking changes should be released as part of major version updates (e.g., from v4.x.x to v5.x.x). Major versions indicate significant changes that may require code modifications from users.

By following these guidelines, you can minimize the impact on users' code when introducing changes to the Strapi types.

## 5. Using Shared Type Registries for Public APIs

When dealing with public oriented APIs, it's recommended to use dynamic type registries in order to offer a pleasant developer experience to both maintainers and users.

- Maintainers will have access to generic loose types
- Users will benefit from detailed generated types for their own applications

Example:

```typescript
// ❌ don't
import type { Schema, UID } from '@strapi/strapi';

export function contentType(uid: UID.Schema): Schema.Schema {
  // ...
}

// ✅ do
import type { Shared, Common } from '@strapi/strapi';

export function contentType<T extends Common.UID.ContentType>(uid: T): Shared.ContentTypes[T] {
  // ...
}
```

Note: If no types are generated, shared registries will resolve to their generic representation.
