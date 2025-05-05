---
title: Routes Matcher Rule
slug: /openapi/contributing/routes-matcher-rule
tags:
  - openapi
  - contributing
  - routes
  - matcher
  - rule
---

# Open API

Learn how to create a new routes' matcher rule

---

### Adding a Routes Matcher Rule

Considering you want to add a new route matcher rule to only select routes with certain methods.

#### 1. Add a new file named `is-method-in.ts` in `src/routes/rules` and paste the following snippet:

```typescript
import type { MatcherRule } from '../types';

export const isMethodIn = (methods: string[]): MatcherRule => {
  return (route) => methods.include(route.method);
};
```

#### 2. Next, export the rule from `src/routes/rules/index.ts`

```typescript
// ... other exports

export { isMethodIn } from './is-method-in';
// ^ export the rule from here
```

#### 3. Finally, pass the new rule to the route collector instance created in the `generate` process in `src/exports.ts`

```typescript
// ...

export const generate = (strapi: Core.Strapi, options?: GenerationOptions): GeneratorOutput => {
  // ...

  const routeCollector = new RouteCollector(
    [
      /* ... */
    ],

    new RouteMatcher([
      // ... other rules
      rules.isMethodIn(['POST', 'PUT']),
      // ^ pass the new rule to the matcher instance
    ])
  );

  // ...
};
```
