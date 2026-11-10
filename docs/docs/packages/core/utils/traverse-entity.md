---
title: traverseEntity
description: 'Utility functions for traversing entity structures.'
---

# Traverse Entity Utility

The `traverseEntity` function is designed to recursively traverse a data entity based on its schema definition. It provides hooks to execute custom logic at each level of the traversal through the `Visitor` function.

## Overview

### Purpose

The utility is used for structured data manipulation. It supports various types of attributes, such as relations, components, dynamic zones, and media, allowing seamless traversal and transformation of deeply nested entities.

## Function: `traverseEntity`

### Signature

```typescript
async function traverseEntity(
  visitor: [Visitor](#visitoroptions),
  options: TraverseOptions,
  entity: Entry
): Promise<Entry>;
```

`traverseEntity` is curried: `traverseEntity(visitor, options)` returns a function that takes the entity. Sanitizers and validators registered with `strapi.sanitizers.add` and `strapi.validators.add` use this form.

### Parameters

- **`visitor`**:  
  A function executed for each attribute of the entity. It provides context and utilities for modifying the entity.

- **`options`**:  
  Configuration for traversal, including:
  - `schema` _(Model)_: The schema definition of the current entity.
  - `path` _(Path, optional)_: Tracks the current traversal path.
  - `parent` _(Parent, optional)_: Information about the parent attribute.
  - `getModel` _(Function)_: A function to retrieve the schema of a model by its UID.

- **`entity`**:  
  The data entity to be traversed. Any plain object type is accepted, including a document whose values are `unknown`. A value typed with an `interface` (no implicit index signature) or a class instance is rejected at compile time. At runtime, a value that is not an object is returned unchanged.

### Returns

A `Promise<Entry>` that resolves with the transformed entity. Traversal works on shallow copies: it copies each object it visits before the visitor runs, so `remove` and `set` never change the input entity. A visitor still receives the caller's nested objects as `value`, so a visitor that mutates `value` in place mutates the input entity.

## Related Types

### Entry

```typescript
type Entry = {
  __type?: string;
  __component?: string;
  [key: string]: unknown;
};
```

The entity that traversal reads and returns. Values are `unknown`, because traversal only reads the keys that the schema describes. A visitor narrows a value before it reads it. `__type` selects the target schema of a morph relation entry, and `__component` the schema of a dynamic zone entry.

### Visitor

```typescript
type Visitor = (visitorOptions: VisitorOptions, visitorUtils: VisitorUtils) => void;
```

A function executed during traversal for each attribute.

**Parameters**:

- **`visitorOptions`** _(VisitorOptions)_: Provides details about the current state of traversal.
- **`visitorUtils`** _(VisitorUtils)_: Utilities for modifying the entity (e.g., `set`, `remove`).

### VisitorOptions

```typescript
interface VisitorOptions {
  data: Record<string, unknown>;
  schema: Model;
  key: string;
  value: unknown;
  attribute?: AnyAttribute;
  path: Path;
  getModel(uid: string): Model;
  parent?: Parent;
}
```

- **`data`**: The current entity or its sub-section being processed.
- **`schema`**: The schema definition of the current entity.
- **`key`**: The current attribute key.
- **`value`**: The current attribute value. It is `unknown`: narrow it before you read it.
- **`attribute`** _(optional)_: The schema attribute definition for the current key.
- **`path`**: Tracks the traversal path.
- **`getModel`**: Function to retrieve a schema definition by UID.
- **`parent`** _(optional)_: Information about the parent attribute.

### VisitorUtils

```typescript
interface VisitorUtils {
  remove(key: string): void;
  set(key: string, value: unknown): void;
}
```

Utility functions to modify the entity:

- **`remove(key)`**: Deletes an attribute from the entity.
- **`set(key, value)`**: Sets or updates an attribute on the entity.

### Path

```typescript
interface Path {
  raw: string | null;
  attribute: string | null;
  rawWithIndices: string | null;
}
```

Tracks the traversal path:

- **`raw`**: The traversal path on the entity
- **`attribute`**: The same traversal path on the schema if the attribute exists
- **`rawWithIndices`**: The traversal path on the entity including array indices using dot notation (e.g., `components.4.field.relations.2.name`)

### Parent

```typescript
interface Parent {
  attribute?: Attribute;
  key: string | null;
  path: Path;
  schema: Model;
}
```

Tracks parent information for the current attribute.

### TraverseOptions

```typescript
interface TraverseOptions {
  schema: Model;
  path?: Path;
  parent?: Parent;
  getModel(uid: string): Model;
}
```

Configuration for the traversal:

- **`schema`**: The schema definition of the current entity.
- **`path`** _(optional)_: Tracks the current traversal path.
- **`parent`** _(optional)_: Information about the parent attribute.
- **`getModel`**: Function to retrieve a schema definition by UID.
