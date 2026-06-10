---
title: Testing
slug: /openapi/contributing/testing
tags:
  - openapi
  - contributing
  - testing
---

# OpenAPI

How to test changes in `@strapi/openapi`.

---

## Location and tooling

Unit tests live in `packages/core/openapi/__tests__/`. Run them from the package directory:

```bash
cd packages/core/openapi && yarn test:unit
```

Shared helpers are in `__tests__/fixtures/` and `__tests__/mocks/`.

---

## Testing route providers

Mock the Strapi instance with only the properties your provider reads. `StrapiMock` in `__tests__/mocks/strapi.mock.ts` covers common `apis` and `plugins` shapes.

```typescript
import type { Core } from '@strapi/types';

import { ApiRoutesProvider } from '../../src/routes';
import { StrapiMock } from '../mocks';

it('returns registered API routes', () => {
  const strapi = new StrapiMock() as unknown as Core.Strapi;
  const provider = new ApiRoutesProvider(strapi);

  expect(provider.routes.length).toBeGreaterThan(0);
});
```

---

## Testing matcher rules

Build a minimal `Core.Route` and pass it to `RouteMatcher`:

```typescript
import type { Core } from '@strapi/types';

import { RouteMatcher } from '../../src/routes';

const route: Core.Route = {
  method: 'GET',
  path: '/api/articles',
  handler: '',
  info: { type: 'content-api' },
};

expect(new RouteMatcher([(r) => r.method === 'GET']).match(route)).toBe(true);
```

---

## Testing assemblers

Create a context through the matching factory, run the assembler, and assert on `context.output.data`:

```typescript
import type { Core } from '@strapi/types';
import * as z from 'zod/v4';

import { OperationParametersAssembler } from '../../src/assemblers/document/path/path-item/operation';
import { OperationContextFactory } from '../../src/context';

const context = new OperationContextFactory().create({ strapi: {} as Core.Strapi, routes: [] }, {});

new OperationParametersAssembler().assemble(context, {
  method: 'GET',
  path: '/api/articles/:id',
  handler: '',
  info: { type: 'content-api' },
  request: {
    params: { id: z.string() },
    query: { locale: z.string().optional() },
  },
});

expect(context.output.data.parameters).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: 'id', in: 'path' }),
    expect.objectContaining({ name: 'locale', in: 'query' }),
  ])
);
```

Route `request` and `response` Zod schemas are the primary inputs to operation assemblers. See `__tests__/operation-assemblers.test.ts` for examples that mirror content API `addQueryParams` / `addInputParams` behaviour.

---

## Debugging failing tests

Enable package debug output from the package directory:

```bash
cd packages/core/openapi && DEBUG=strapi:core:openapi:* yarn test:unit
```

See [Technologies](../technologies) for the debug namespace conventions.
