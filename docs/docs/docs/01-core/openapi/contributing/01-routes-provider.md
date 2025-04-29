---
title: Routes Provider
slug: /openapi/contributing/routes-provider
tags:
  - openapi
  - contributing
  - routes
  - provider
---

# Open API

Learn how to create a new routes provider

---

## Adding a Routes Provider

Considering you want to add a new provider called `xxx`.

#### 1. Add a new `xxx.ts` file in `src/routes/providers` and paste the following snippet:

```typescript
import type { Core } from '@strapi/types';

import { createDebugger } from '../../utils';

import { AbstractRoutesProvider } from './abstract';

const debug = createDebugger('routes:provider:xxx');

export class XXXRoutesProvider extends AbstractRoutesProvider {
  public get routes(): Core.Route[] {
    const routes = [];
    // ^ The routes collection logic goes here
    //   Access to this._strapi to interact with the Strapi application

    debug('found %o routes in xxx', routes.length);

    return routes;
  }
}
```

#### 2. Next, export the provider from `src/providers/index.ts`

```typescript
// ...

export { XXXRoutesProvider } from './xxx';
// ^ export the provider from here
```

#### 3. Finally, modify the generate function in the exports.ts file to use the newly created provider

```typescript
// ...

import {
  // ... 
  XXXRoutesProvider,
  // ^  import the newly created provider
} from './routes';


export const generate = (strapi: Core.Strapi, options?: GenerationOptions): GeneratorOutput => {
  // ...

  const routeCollector = new RouteCollector(
    [
      // ... other providers
      new XXXRoutesProvider(strapi),
      // ^ instantiate the new provider here
    ],
    // ...
  );

  // ...
};
```
