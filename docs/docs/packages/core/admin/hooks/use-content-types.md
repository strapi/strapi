---
title: useContentTypes
description: API reference for the useContentTypes hook in Strapi's Content Manager
tags:
  - hooks
status: draft
review_notes:
  - Short page; the hook lives in `packages/core/admin/admin/src/hooks`.
---

An abstraction around `react-query` to fetch content-types and components. It returns the raw API response
for components. `collectionTypes` and `singleTypes` are filtered by `isDisplayed=true`.

## Usage

```jsx
import { useContentTypes } from 'path/to/hooks';

const MyComponent = () => {
  const { isLoading, collectionTypes, singleTypes, components } = useContentTypes();

  return (/* ... */);
};
```
