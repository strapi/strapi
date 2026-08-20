---
title: Context Factory
slug: /openapi/contributing/context-factory
tags:
  - openapi
  - contributing
  - context
---

# OpenAPI

Learn how to add a context factory for a new assembly level.

---

## When to add one

Each assembler level operates on a typed context (`DocumentContext`, `OperationContext`, etc.) created by a matching factory. Add a new factory when you introduce a **new assembly level** with its own output shape.

If you only add leaf assemblers at an existing level, reuse the existing factory (e.g. `OperationContextFactory`).

---

## Adding a context factory

Suppose you need a new assembly level with its own output shape. Follow the pattern used by `OperationContextFactory`.

#### 1. Define the context data type in `src/types.ts`

```typescript
import type { Context } from './context';

export type WidgetContextData = Partial<{ widgets: Record<string, unknown> }>;
export type WidgetContext = Context<WidgetContextData>;
```

#### 2. Create `src/context/factories/widget.ts`

```typescript
import { RegistriesFactory } from '../../registries';
import type { WidgetContext, WidgetContextData } from '../../types';
import { TimerFactory } from '../../utils';
import type { PartialContext } from '../types';

import { AbstractContextFactory } from './abstract';

export class WidgetContextFactory extends AbstractContextFactory<WidgetContextData> {
  constructor(
    registriesFactory: RegistriesFactory = new RegistriesFactory(),
    timerFactory: TimerFactory = new TimerFactory()
  ) {
    super(registriesFactory, timerFactory);
  }

  create(context: PartialContext<WidgetContextData>): WidgetContext {
    return super.create(context, {});
  }
}
```

`AbstractContextFactory.create()` builds a context with:

- `strapi` and `routes` (required)
- `timer` and `registries` (reused from the parent when provided, otherwise created fresh)
- `output.data` initialized to the `defaultValue` passed to `super.create()`

#### 3. Export from `src/context/factories/index.ts`

```typescript
export { WidgetContextFactory } from './widget';
```

#### 4. Use in your composite assembler

Pass shared props from the parent context so sub-assemblers share the same timer and registries:

```typescript
const childContext = this._contextFactory.create({
  strapi: context.strapi,
  routes: context.routes,
  timer: context.timer,
  registries: context.registries,
});
```

---

## Registries

`RegistriesFactory.createAll()` currently returns an empty object and `ContextRegistries` is an empty interface. Registries are reserved for future shared assembly state (deduplicated schemas, cross-assembler caches, etc.). No separate setup is required today.
