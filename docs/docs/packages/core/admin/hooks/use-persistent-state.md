---
title: usePersistentState
description: API reference for the usePersistentState hook in Strapi
tags:
  - hooks
status: needs-review
review_notes:
  - Written for `@strapi/helper-plugin`, removed in v5. The hook now lives in `packages/core/admin/admin/src/hooks/usePersistentState.ts`.
---

Provides a easily usable hook to store data on the local storage.

## Usage

```js
import { usePersistentState } from '@strapi/helper-plugin';

const MyComponent = () => {
  const [navbarOpened, setNavbarOpened] = usePersistentState('navbar-open', true);

  return <nav>{navbarOpened ? <div>My menu!</div> : null}</nav>;
};
```

## Typescript

```ts
function usePersistentState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>];
```
