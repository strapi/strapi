---
title: Guided Tour
---

This document explains how to create and use Guided Tours in the Strapi CMS.

## Creating tours

To create a tour use the `createTour` factory function. The function takes the name of the tour and an array of steps.

The `content` key of a step is a render prop that receives `Step` and an object with `state` and `dispatch`.

`Step` has the following composable parts:

| Component      | Description                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Step.Root`    | A wrapper of Popover.Content to allow full customization of the popover placement                                                                                     |
| `Step.Title`   | For simple use cases you can provide the translation props `id` and `defaultMessage`, otherwise completely replace the default implementation by providing `children` |
| `Step.Content` | For simple use cases you can provide the translation props `id` and `defaultMessage`, otherwise completely replace the default implementation by providing `children` |
| `Step.Actions` | For simple use cases you can specify the `showSkip` and `showStepCount` props, otherwise completely replace the default implementation by providing `children`        |

```tsx
const tours = {
  contentManager: createTour('contentManager', [
    {
      name: 'TheFeatureStepName',
      content: (Step) => (
        <Step.Root side="right">
          <Step.Title
            id="tours.contentManager.TheFeatureStepName.title"
            defaultMessage="The Feature"
          />
          <Step.Content
            id="tours.contentManager.TheFeatureStepName.content"
            defaultMessage="This is the content for Step 1 of some feature"
          />
          <Step.Actions showSkip />
        </Step.Root>
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

The provider derives the tour state. Continuing our example from above, the initial tour state would be:

```ts
{
  contentManager: {
    currentStep: 0,
    length: 1,
    isCompleted: false,
  };
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
