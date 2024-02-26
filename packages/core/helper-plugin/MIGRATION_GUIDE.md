# Helper-plugin Migration Guide

This document has been written incrementally to help developers migrate their strapi plugins & applications to _not_ use the `helper-plugin` package.
It is written in alphabetical order grouped by domain based on _every_ export that existed in the aforementioned package.

## Components

### DateTimePicker

This was aliasing the design-system. You should import the component from there:

```ts
// Before
import { DateTimePicker } from '@strapi/helper-plugin';

// After
import { DateTimePicker } from '@strapi/design-system';
```

## Content Manager

### contentManagementUtilRemoveFieldsFromData

This function has been removed and not replaced. If you feel like you need this function, please open an issue on the Strapi repository to discuss your usecase.

### formatContentTypeData

This function has been removed and not replaced. If you feel like you need this function, please open an issue on the Strapi repository to discuss your usecase.

### useCMEditViewDataManager

This hook has been split into different hooks, each with more ability then it's previous:

- useDocument
- useDocumentLayout
- useDocumentRBAC
- useForm

```ts
// Before
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

// After
import {
  useDocument,
  useDocumentActions,
  useDocumentLayout,
  useDocumentRBAC,
  useForm,
} from '@strapi/strapi/admin/hooks';
```

Some common use cases are listed below:

```ts
// Before
const { slug, isSingleType, isCreatingEntry } = useCMEditViewDataManager();

// After
const { model, id, collectionType } = useDocument();
const isSingleType = collectionType === 'single-types';
const isCreatingEntry = id === 'create';
```

```ts
// Before
const { onPublish, onUnpublish } = useCMEditViewDataManager();

// After
const { publish, unpublish } = useDocumentActions();
```

```ts
// Before
const { layout } = useCMEditViewDataManager();

// After
const {
  edit: { layout, components },
} = useDocumentLayout();
```
