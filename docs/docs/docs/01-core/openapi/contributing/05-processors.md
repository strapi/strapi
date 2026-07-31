---
title: Processors
slug: /openapi/contributing/processors
tags:
  - openapi
  - contributing
  - processors
---

# OpenAPI

Learn how to add pre- and post-processors to the generation lifecycle.

---

## Overview

The generator runs components in this order:

1. **Pre-processors** — prepare the document context before assembly
2. **Assemblers** — build the OpenAPI document
3. **Post-processors** — finalize the document after assembly

Both processor types receive the full `DocumentContext`. Register instances in `PreProcessorFactory` or `PostProcessorsFactory`; those factories are wired in `src/exports.ts`.

---

## Adding a post-processor

`ComponentsWriter` is the current post-processor: it writes `components.schemas` from `z.globalRegistry` after assembly.

#### 1. Create a processor class

```typescript
import type { DocumentContext } from '../types';
import type { PostProcessor } from './types';

export class ExamplePostProcessor implements PostProcessor {
  postProcess(context: DocumentContext): void {
    // mutate context.output.data
  }
}
```

#### 2. Register it in `PostProcessorsFactory`

```typescript
import { ComponentsWriter } from './component-writer';
import { ExamplePostProcessor } from './example';

export class PostProcessorsFactory {
  createAll(): PostProcessor[] {
    return [new ComponentsWriter(), new ExamplePostProcessor()];
  }
}
```

Pre-processors implement `PreProcessor` with a `preProcess(context: DocumentContext)` method and are registered the same way in `PreProcessorFactory`.

:::tip
Prefer assemblers for building document sections. Use processors only for cross-cutting work that must run before or after the full assembly pass.
:::
