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

### Link

This was aliasing the design-system and using the `as` prop with `react-router-dom`. You should import the component from there:

```ts
// Before
import { Link } from '@strapi/helper-plugin';

// After
import { Link } from '@strapi/design-system/v2';
import { NavLink } from 'react-router-dom';

const MyLink = () => {
  return (
    <Link as={NavLink} to="/my-link">
      My Link
    </Link>
  );
};
```

### LinkButton

This was aliasing the design-system and using the `as` prop with `react-router-dom`. You should import the component from there:

```ts
// Before
import { LinkButton } from '@strapi/helper-plugin';

// After
import { LinkButton } from '@strapi/design-system/v2';
import { NavLink } from 'react-router-dom';

const MyLink = () => {
  return (
    <LinkButton as={NavLink} to="/my-link">
      My Link
    </LinkButton>
  );
};
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
