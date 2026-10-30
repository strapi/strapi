---
title: createContext
description: API reference for the createContext helper of the admin, and how its consumers re-render
tags:
  - hooks
  - public-api
  - frontend
---

:::warning
This helper is experimental and may change in a future release.
:::

`createContext` creates a context provider and a hook that reads a slice of the context with a selector. It is exported from `@strapi/admin/strapi-admin`. The admin builds its form, RBAC and many other contexts with it.

Source: [`packages/core/admin/admin/src/components/Context.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/components/Context.tsx).

## Usage

```tsx
import { createContext } from '@strapi/admin/strapi-admin';

const [CounterProvider, useCounter] = createContext<{ count: number }>('Counter');

const Count = () => {
  const count = useCounter('Count', (state) => state.count);

  return <span>{count}</span>;
};

const App = () => (
  <CounterProvider count={1}>
    <Count />
  </CounterProvider>
);
```

## API

```ts
function createContext<ContextValue extends object | null>(
  rootComponentName: string,
  defaultContext?: ContextValue
): [Provider, useContext];

function useContext<Selected>(
  consumerName: string,
  selector: (value: ContextValue) => Selected,
  shouldThrowOnMissingContext?: boolean
): Selected;
```

- The provider takes the context value as props. It keeps the same value while the props don't change.
- Outside of a provider, `useContext` reads `defaultContext`. Without a default, it returns `undefined`, or throws a named error when `shouldThrowOnMissingContext` is `true`.

## Re-renders

The provider keeps its value in a store. `useContext` subscribes to the store with `useSyncExternalStore` and compares the selected value with `Object.is`, outside of render. A consumer re-renders only when the value it selects changes.

- Select the values that the component renders. A selector that returns a new object on every call still works, but its component re-renders on every change of the context.
- Do not select a stable function, such as `getValues`, and call it during render to read the context. The component doesn't re-render when the value behind the function changes, so it renders stale data. Select the value instead. Calling such a function in an event handler or an effect is fine.
- The provider pushes its value into the store in a layout effect. A consumer rendered in the same pass as a provider update reads the previous value for that commit, then re-renders before paint.

The helper used to be built on `use-context-selector`. With React 18, that library ran the render function of every consumer on every change of the context, which kept stale reads like the one above up to date by accident.
