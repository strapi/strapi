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

### CheckPermissions

This component has been removed and not replaced. If you feel like you need this component, please open an issue on the Strapi repository to discuss your usecase.

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

### ConfirmDialog

This component has been moved and refactored. It can imported from the `@strapi/strapi/admin` package:

```tsx
// Before
import { ConfirmDialog } from '@strapi/helper-plugin';

// After
import { ConfirmDialog } from '@strapi/strapi/admin';
```

Please see the documentation for the `ConfirmDialog` component for more information.

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

### DynamicTable

This component was previously deprecated and has now been removed. Similar to the deprecation notice, we recommend using the `Table` component from `@strapi/strapi/admin`.

### EmptyBodyTable

This component has been removed and is part of the `Table` component.

### EmptyStateLayout

This component has been removed and not replaced. You should use `EmptyStateLayout` from `@strapi/design-system`:

```tsx
// Before
import { EmptyStateLayout } from '@strapi/helper-plugin';

// After
import { EmptyStateLayout } from '@strapi/design-system';
```

NOTE! the props will be different. Please refer to the documentation for the `EmptyStateLayout` component.

### FilterListURLQuery

This component was moved to the `admin` package and can now be imported via the `@strapi/strapi` package as part of the composite component `Filters`:

```tsx
// Before
import { FilterListURLQuery } from '@strapi/helper-plugin';

// After
import { Filters } from '@strapi/strapi/admin';

const MyComponent = () => {
  return (
    <Filters.Root>
      <Filters.List />
    </Filters.Root>
  );
};
```

### FilterPopoverURLQueryProps

This component was moved to the `admin` package and can now be imported via the `@strapi/strapi` package as part of the composite component `Filters`:

```tsx
// Before
import { FilterPopoverURLQueryProps } from '@strapi/helper-plugin';

// After
import { Filters } from '@strapi/strapi/admin';

const MyComponent = () => {
  return (
    <Filters.Root>
      <Filters.Trigger />
      <Filters.Popover />
    </Filters.Root>
  );
};
```

### Form

This component aliased `Formik`, something we're working towards removing. The `Form` component and it's sibling exports from `@strapi/strapi/admin` should be used instead:

```tsx
// Before
import { Form } from '@strapi/helper-plugin';

// After
import { Form } from '@strapi/strapi/admin';
```

Users should note that any use of the Formik library will no longer work & insted should look at the documentation for the `Form` component.

### GenericInput

This component has been removed and refactored to become the `InputRenderer` component exported from `@strapi/strapi/admin`. You should use the `InputRenderer` component from there:

```tsx
// Before
import { GenericInput } from '@strapi/helper-plugin';

// After
import { InputRenderer } from '@strapi/strapi/admin';
```

Note, that the `InputRenderer` component has a different API, and you should refer to the documentation for the `InputRenderer` component.

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

### PageSizeURLQuery

This component was moved to the `admin` package and can now be imported via the `@strapi/strapi` package as part of the composite component `Pagination`:

```tsx
// Before
import { PageSizeURLQuery } from '@strapi/helper-plugin';

// After
import { Pagination } from '@strapi/strapi/admin';

const MyComponent = () => {
  return (
    <Pagination.Root>
      <Pagination.PageSize />
    </Pagination.Root>
  );
};
```

Note, there were some slightly behavioural changes i.e. the PageSize won't render if the lowest pageSize is 10 but you only have 9 entries. Due to the refactor some props will have moved and changed, please look at the documentation for the Pagination component for more info.

### PaginationURLQueryProps

This component was moved to the `admin` package and can now be imported via the `@strapi/strapi` package as part of the composite component `Pagination`:

```tsx
// Before
import { PaginationURLQueryProps } from '@strapi/helper-plugin';

// After
import { Pagination } from '@strapi/strapi/admin';

const MyComponent = () => {
  return (
    <Pagination.Root pageCount={2}>
      <Pagination.Links />
    </Pagination.Root>
  );
};
```

Note, there were some slightly behavioural changes i.e. the Links won't render if there are less than 2 pages. Due to the refactor some props will have moved and changed, please look at the documentation for the Pagination component for more info.

### ReactSelect

This component has been removed and not replaced. If you feel like you need this component, please open an issue on the Strapi repository to discuss your usecase.

### RelativeTime

This component has been removed and not replaced. If you feel like you need this component, please open an issue on the Strapi repository to discuss your usecase.

### SearchURLQuery

This component was removed and renamed to `SearchInput` and can now be imported by the `@strapi/strapi` package:

```tsx
// Before
import { SearchURLQuery } from '@strapi/helper-plugin';

// After
import { SearchInput } from '@strapi/strapi/admin';
```

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

### Table

This component should be imported from the `@strapi/strapi/admin` package:

```tsx
// Before
import { Table } from '@strapi/helper-plugin';

// After
import { Table } from '@strapi/strapi/admin';
```

Note! some of the props have changed, please refer to the documentation for the `Table` component.

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

## Hooks

### useCallbackRef

This component has been removed. You should import it from the `@strapi/design-system` package:

```tsx
// Before
import { useCallbackRef } from '@strapi/helper-plugin';

// After
import { useCallbackRef } from '@strapi/design-system';
```

### useCollator

This component has been removed. You should import it from the `@strapi/design-system` package:

```tsx
// Before
import { useCollator } from '@strapi/helper-plugin';

// After
import { useCollator } from '@strapi/design-system';
```

### useFilter

This component has been removed. You should import it from the `@strapi/design-system` package:

```tsx
// Before
import { useFilter } from '@strapi/helper-plugin';

// After
import { useFilter } from '@strapi/design-system';
```

## Icons

### SortIcon

This component has been removed and not replaced. If you feel like you need this function, please open an issue on the Strapi repository to discuss your usecase.

### RemoveRoundedButton

This component has been removed and not replaced. If you feel like you need this function, please open an issue on the Strapi repository to discuss your usecase.

## Utils

### awaitToJs

This util has been removed and not replaced, use async / await with try / catch instead. If you feel like you need this util, please open an issue on the Strapi repository to discuss your usecase.

### difference

This util has been removed and not replaced. If you feel like you need this util, please open an issue on the Strapi repository to discuss your usecase.

### getFileExtension

This util has been removed and not replaced. If you feel like you need this util, please open an issue on the Strapi repository to discuss your usecase.

### prefixFileUrlWithBackendUrl

This util has been removed and not replaced. Use the strapi backendUrl to prefix the relative url if you need. If you feel like you need this util, please open an issue on the Strapi repository to discuss your usecase.

### pxToRem

This util has been removed and not replaced. You should use directly this code in place of the pxToRem:

```tsx
// Before
pxToRem(
  32
) // After
`${32 / 16}rem`;
// or
('2rem');
```

If you feel like you need this util, please open an issue on the Strapi repository to discuss your usecase.

### request

This util has been removed and not replaced.
You can use `useFetchClient` from `@strapi/admin/strapi-admin`.

```tsx
import { useFetchClient } from '@strapi/admin/strapi-admin';
```

And you can use it like this

```tsx
const { get } = useFetchClient();

const { data } = await get(requestURL);
```

If you feel like you need this util, please open an issue on the Strapi repository to discuss your usecase.

### setHexOpacity

This util has been removed and not replaced, use the native CSS opacity property instead. If you feel like you need this util, please open an issue on the Strapi repository to discuss your usecase.

### wrapAxiosInstance

This util has been removed and not replaced. If you feel like you need this util, please open an issue on the Strapi repository to discuss your usecase.
