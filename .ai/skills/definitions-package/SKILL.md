---
name: strapi-definitions-package
description: Guide AI agents when consuming or editing @strapi/definitions. Use when modifying packages/definitions, adding constants/schemas/types there, promoting shared definitions to break package cycles, or deciding how @strapi/definitions relates to @strapi/strapi and @strapi/types.
---

# Definitions Package

Use this skill before changing `packages/definitions` or importing from `@strapi/definitions`.

## Role Of The Package

`@strapi/definitions` is the source of truth for low-level Strapi definitions:

- passive runtime primitives: constants and schemas
- dependency-free concepts shared across packages

It is **public low-level**, semver-respected, but not the primary user-facing import path. User-facing APIs should be curated through `@strapi/strapi`.

## Layering

Prefer this direction:

```txt
@strapi/definitions
  low-level constants, schemas

@strapi/strapi
  public-facing API exposure for users and plugin authors

@strapi/types
  backwards-compatible facade for type imports (not yet migrated to definitions)
```

Do not make `definitions` depend on Strapi runtime packages, DI, app config, database clients, or package implementation details.

## Promotion Test

Promote a value/type into `@strapi/definitions` only when it passes most of this test:

- It is needed by multiple packages, or needed to break a dependency cycle.
- It is dependency-free, except tiny definition-layer dependencies already owned by this package, such as `zod`.
- It is passive definition data, not business logic.
- Its semantic name makes sense without mentioning the source package.
- It represents a stable Strapi vocabulary or invariant.

Keep package-local details in their owning package. Do not promote a helper only because two packages happen to duplicate it.

## API Shape

Use kind-first root namespaces:

```ts
import { constants, schemas, z } from '@strapi/definitions';
```

Root namespaces:

- `constants` for primitive constants and magic literals
- `schemas` for runtime schema objects, when schemas exist
- `z` for the shared Zod export

> **Types are not yet part of this package.** The question of how and whether to move type primitives (e.g. UID templates, namespace helpers) from `@strapi/types` into `@strapi/definitions` is unresolved. Do not add type exports until a design decision is made — keep types in `@strapi/types` for now.

Do **not** add a nested `definitions.*` namespace. The package name already carries that meaning.

## Namespace Rules

Default to:

```txt
<kind>.<semantic-family>.<name>
```

Examples:

```ts
constants.regex.BIG_INTEGER;
constants.numbers.INT64_MAX;
schemas.contentTypes.contentType;
schemas.fields.bigInteger;
```

Use semantic domains, not consumer package names:

- Prefer broad concepts like `regex`, `numbers`, `fields`, `contentTypes`, `persistence`.
- Reserve `database` for actual Strapi database abstraction contracts.
- Do not mirror monorepo package names unless the concept is truly package-domain vocabulary.

## Naming Rules

Use:

- `SCREAMING_SNAKE_CASE` for primitive constants, frozen values, and magic literals.
- `camelCase` for schemas and richer definition objects.
- no `Schema` suffix unless it prevents ambiguity.
- JSDoc for every exported value/type. Public low-level definitions must document intent, not restate TypeScript shapes.

Examples:

```ts
constants.regex.BIG_INTEGER;
schemas.fields.bigInteger;
schemas.contentTypes.contentType;
```

## Runtime Helpers

Keep `definitions` passive-first.

Allowed:

```ts
constants.regex.BIG_INTEGER;
schemas.fields.bigInteger;
```

Avoid:

```ts
validators.isBigInteger();
normalizers.toBigIntegerString();
builders.createContentTypeSchema();
```

Active helpers usually belong in `@strapi/utils`, `@strapi/database`, `@strapi/core`, or `@strapi/strapi`. Only add active helpers with explicit justification.

## Subpaths

Do not add package subpath exports. Use root namespace imports:

```ts
import { constants } from '@strapi/definitions';

constants.regex.BIG_INTEGER;
```
