---
title: Assemblers
slug: /openapi/contributing/assemblers
tags:
  - openapi
  - contributing
  - assemblers
---

# OpenAPI

Learn how to add assemblers to the document generation pipeline.

---

## Assembler levels

Assemblers build the OpenAPI document in layers. Each level has a matching context type (see [Context factory](./04-context-factory.md)).

| Level     | Interface             | Example                        | Factory                     |
| --------- | --------------------- | ------------------------------ | --------------------------- |
| Document  | `Assembler.Document`  | `DocumentInfoAssembler`        | `DocumentAssemblerFactory`  |
| Path      | `Assembler.Path`      | `PathItemAssembler`            | `PathAssemblerFactory`      |
| Path item | `Assembler.PathItem`  | `OperationAssembler`           | `PathItemAssemblerFactory`  |
| Operation | `Assembler.Operation` | `OperationParametersAssembler` | `OperationAssemblerFactory` |

Most day-to-day changes are **operation-level leaf assemblers** (parameters, body, responses, etc.). Add a **composite assembler** when you need to orchestrate a new nested structure.

---

## Adding a leaf assembler

Consider adding an operation assembler called `OperationSummaryAssembler` that sets `summary` from route metadata.

#### 1. Create `summary.ts` in `src/assemblers/document/path/path-item/operation`

```typescript
import type { Core } from '@strapi/types';

import type { OperationContext } from '../../../../../types';
import { createDebugger } from '../../../../../utils';
import type { Assembler } from '../../../..';

const debug = createDebugger('assembler:summary');

export class OperationSummaryAssembler implements Assembler.Operation {
  assemble(context: OperationContext, route: Core.Route): void {
    const summary = route.info.apiName ?? route.handler;

    debug('assembling summary for %o %o: %o', route.method, route.path, summary);

    context.output.data.summary = summary;
  }
}
```

Leaf assemblers receive the context for their level plus any extra arguments defined on the interface (operation assemblers also receive the `route`).

Write results into `context.output.data`. That object is merged into the parent output by the composite assembler that invoked yours.

#### 2. Export from `src/assemblers/document/path/path-item/operation/index.ts`

```typescript
export { OperationSummaryAssembler } from './summary';
```

#### 3. Register in `OperationAssemblerFactory.createAll()`

```typescript
import { OperationSummaryAssembler } from './summary';

export class OperationAssemblerFactory {
  createAll(): Assembler.Operation[] {
    return [
      // ... existing assemblers
      new OperationSummaryAssembler(),
    ];
  }
}
```

For a **document-level** leaf assembler (e.g. a new top-level OpenAPI field), follow the same pattern under `src/assemblers/document/` and register it in `DocumentAssemblerFactory`.

---

## Adding a composite assembler

Composite assemblers create a child context, run sub-assemblers, then merge the result into the parent output. `OperationAssembler` (`src/assemblers/document/path/path-item/operation/operation.ts`) is the reference implementation.

Use this pattern when you introduce a new nested document section that needs its own context and multiple sub-assemblers.

#### 1. Implement the composite class

```typescript
import type { Core } from '@strapi/types';

import { OperationContextFactory } from '../../../../../context';
import type { PathItemContext } from '../../../../../types';
import type { Assembler } from '../../../..';

export class OperationAssembler implements Assembler.PathItem {
  constructor(
    private readonly _assemblers: Assembler.Operation[],
    private readonly _contextFactory: OperationContextFactory = new OperationContextFactory()
  ) {}

  assemble(context: PathItemContext, path: string, routes: Core.Route[]): void {
    const { output, ...sharedProps } = context;

    for (const route of routes) {
      const operationContext = this._contextFactory.create(sharedProps);

      for (const assembler of this._assemblers) {
        assembler.assemble(operationContext, route);
      }

      Object.assign(output.data, { [route.method.toLowerCase()]: operationContext.output.data });
    }
  }
}
```

#### 2. Wire it through a factory

Create or extend a factory (e.g. `PathItemAssemblerFactory`) that instantiates your composite assembler with its sub-assemblers and context factory, then register that factory in the parent level (`PathAssemblerFactory` or `DocumentAssemblerFactory`).

:::tip
Reuse `timer` and `registries` from the parent context when creating child contexts so timing and shared state stay consistent. Pass them via `PartialContext` (see [Context factory](./04-context-factory.md)).
:::
