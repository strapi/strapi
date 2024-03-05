# Helper-plugin Migration Guide

This document has been written incrementally to help developers migrate their strapi plugins & applications to _not_ use the `helper-plugin` package.
It is written in alphabetical order grouped by domain based on _every_ export that existed in the aforementioned package.

## Components

### AnErrorOccurred

This component has been removed and refactored to be part of the `Page` component exported from `@strapi/strapi/admin`. You should use the `Page` component from there:

```tsx
// Before
import { AnErrorOccurred } from '@strapi/helper-plugin';

// After
import { Page } from '@strapi/strapi/admin';

const MyPage = () => {
  // ...

  if (error) {
    return <Page.Error />;
  }

  // ...
};
```

### CheckPagePermissions

This component has been removed and refactored to be part of the `Page` component exported from `@strapi/strapi/admin`. You should use the `Page` component from there:

```tsx
// Before
import { CheckPagePermissions } from '@strapi/helper-plugin';

// After
import { Page } from '@strapi/strapi/admin';

const MyProtectedPage = () => {
  return (
    <Page.Protect permissions={[action: 'plugin::my-plugin.read']}>
      <MyPage />
    </Page.Protect>
  );
};
```

The behaviour has slightly changed, where previously no permissions would redirect you to the root of the page, now it will render the `NoPermissions` component.

### ContentBox

This component has been removed and not replaced. If you feel like you need this component, please open an issue on the Strapi repository to discuss your usecase.

### DateTimePicker

This was aliasing the design-system. You should import the component from there:

```tsx
// Before
import { DateTimePicker } from '@strapi/helper-plugin';

// After
import { DateTimePicker } from '@strapi/design-system';
```

### EmptyStateLayout

This component has been removed and not replaced. You should use `EmptyStateLayout` from `@strapi/design-system`:

```tsx
// Before
import { EmptyStateLayout } from '@strapi/helper-plugin';

// After
import { EmptyStateLayout } from '@strapi/design-system';
```

NOTE! the props will be different. Please refer to the documentation for the `EmptyStateLayout` component.

### Form

This component aliased `Formik`, something we're working towards removing. The `Form` component and it's sibling exports from `@strapi/strapi/admin` should be used instead:

```tsx
// Before
import { Form } from '@strapi/helper-plugin';

// After
import { Form } from '@strapi/strapi/admin';
```

Users should note that any use of the Formik library will no longer work & insted should look at the documentation for the `Form` component.

### InjectionZone

This component has been removed and not replaced. However, you can easily replicate this in your own project by using the `useStrapiApp` hook:

```tsx
const MyComponent = ({ area, ...compProps }) => {
  const { getPlugin } = useStrapiApp();

  const [pluginName, page, position] = area.split('.');

  const plugin = getPlugin(pluginName);
  const components = plugin?.getInjectedComponents(page, position);

  if (!plugin || !components) {
    return null;
  }

  return components.map(({ name, Component }) => <Component key={name} {...props} />);
};
```

### Link

This was aliasing the design-system and using the `as` prop with `react-router-dom`. You should import the component from there:

```tsx
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

```tsx
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

### LoadingIndicatorPage

This component has been removed and refactored to be part of the `Page` component exported from `@strapi/strapi/admin`. You should use the `Page` component from there:

```tsx
// Before
import { LoadingIndicatorPage } from '@strapi/helper-plugin';

// After
import { Page } from '@strapi/strapi/admin';

const MyPage = () => {
  // ...

  if (isLoading) {
    return <Page.Loading />;
  }

  // ...
};
```

### NoContent

This component has been removed and not replaced, you should use the `EmptyStateLayout` component from `@strapi/design-system`.

### NoMedia

This component has been removed and not replaced. If you feel like you need this component, please open an issue on the Strapi repository to discuss your usecase.

### NoPermissions

This component has been removed and refactored to be part of the `Page` component exported from `@strapi/strapi/admin`. You should use the `Page` component from there:

```tsx
// Before
import { NoPermissions } from '@strapi/helper-plugin';

// After
import { Page } from '@strapi/strapi/admin';

const MyPage = () => {
  // ...

  if (!canRead) {
    return <Page.NoPermissions />;
  }

  // ...
};
```

### NotAllowedInput

This component has been removed and not replaced. If you feel like you need this component, please open an issue on the Strapi repository to discuss your usecase. You can easily replicate this in your own project by using the `TextInput` from `@strapi/design-system`:

```tsx
import { TextInput } from '@strapi/design-system';

const MyComponent = (props) => {
  return (
    <TextInput disabled placeholder="No permissions to see this field" type="text" {...props} />
  );
};
```

### ReactSelect

This component has been removed and not replaced. If you feel like you need this component, please open an issue on the Strapi repository to discuss your usecase.

### SettingsPageTitle

This component has been removed and not replaced. If you feel like you need this component, please open an issue on the Strapi repository to discuss your usecase.

### Status

This component should be imported from the `@strapi/design-system` package:

```tsx
// Before
import { Status } from '@strapi/helper-plugin';

// After
import { Status } from '@strapi/design-system';
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

```tsx
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

```tsx
// Before
const { slug, isSingleType, isCreatingEntry } = useCMEditViewDataManager();

// After
const { model, id, collectionType } = useDocument();
const isSingleType = collectionType === 'single-types';
const isCreatingEntry = id === 'create';
```

```tsx
// Before
const { onPublish, onUnpublish } = useCMEditViewDataManager();

// After
const { publish, unpublish } = useDocumentActions();
```

```tsx
// Before
const { layout } = useCMEditViewDataManager();

// After
const {
  edit: { layout, components },
} = useDocumentLayout();
```

## Icons

### SortIcon

This component has been removed and not replaced. If you feel like you need this function, please open an issue on the Strapi repository to discuss your usecase.

### RemoveRoundedButton

This component has been removed and not replaced. If you feel like you need this function, please open an issue on the Strapi repository to discuss your usecase.
