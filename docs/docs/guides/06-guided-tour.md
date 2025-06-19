---
title: Guided Tour
---

This document explains how to create and use Guided Tours in the Strapi CMS.

## Creating tours

To create a tour use the `createTour` factory function.

```tsx
const tours = {
  contentManager: createTour('contentManager', [
    {
      name: 'TheFeatureStepName',
      content: () => (
        <>
          <div>This is the content for Step 1 of some feature</div>
        </>
      ),
    },
  ]),
} as const;
```

Tours for the CMS are defined in the `packages/core/admin/admin/src/components/UnstableGuidedTour/Tours.tsx` file.

The tours are then passed to the `UnstableGuidedTourContext` provider.

```tsx
import { tours } from '../UnstableGuidedTour/Tours';
import { UnstableGuidedTourContext } from '../UnstableGuidedTour/Context';

function App() {
  return (
    <UnstableGuidedTourContext tours={tours}>
      <Outlet />
    </UnstableGuidedTourContext>
  );
}
```

The provider derives the tour state from the tours object to create an object where each tour's name points to its current step index.

Continuing our example from above the intial tour state would be:

```ts
{
  contentManager: 0;
}
```

## Displaying tours in the CMS

The tours object is exported from strapi admin and can be accessed anywhere in the CMS. Wrapping an element will anchor the tour tooltip to that element.

```tsx
import { tours } from '../UnstableGuidedTour/Tours';

<tours.contentManager.TheFeatureStepName>
  <div>A part of a feature I want to show off<div>
</tours.contentManager.TheFeatureStepName>
```
