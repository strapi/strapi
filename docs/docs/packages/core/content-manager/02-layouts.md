---
title: Layouts
description: How layouts work with the List & Edit view
---

Layouts are fundamental to how the CM renders its list & edit views. The edit view's layout can be manipulated via plugins using the `'Admin/CM/pages/EditView/mutate-edit-view-layout'` hook. Meanwhile the list view can currently only have table columns injected.

## What is a layout?

A layout is simply a data-structure we iterate over to understand how to render the views. For both List & Edit view their structures have explicitly been designed to be similar:

```ts
interface ListLayout {
  layout: ListFieldLayout[];
  components?: never;
  metadatas: object;
  settings: object;
}

interface EditLayout {
  layout: Array<Array<EditFieldLayout[]>>;
  components: Record<string, Omit<EditLayout, 'metadatas' | 'components'>>;
  metadatas: object;
  settings: object;
}
```

The above types have been simplified for the purpose of explanation, but you can see from the `components` property of the `EditLayout` that it's essentially the same as its parent, just a nested and organised per component. This consistency allows us to easily iterate over the layouts and render the views using the same components for the general layout & component layouts.

## How are they made?

The layout is a combination of a content-types's schema & its configuration file, while their data-structures are similar they differ at the very root interface.

### EditView

The very base level interface for the EditView layout is an `EditFieldLayout` which is primarily derived from the `InputProps` of our Form Components:

```ts
interface InputProps {
  disabled?: boolean;
  hint?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type: Exclude<
    Attribute.Kind,
    'media' | 'blocks' | 'richtext' | 'uid' | 'dynamiczone' | 'component' | 'relation'
  >;
}

interface EditFieldSharedProps extends Omit<InputProps, 'type'> {
  mainField?: string;
  size: number;
  unique?: boolean;
  visible?: boolean;
}

/**
 * Map over all the types in Attribute Types and use that to create a union of new types where the attribute type
 * is under the property attribute and the type is under the property type.
 */
type EditFieldLayout = {
  [K in Attribute.Kind]: EditFieldSharedProps & {
    attribute: Extract<Attribute.Any, { type: K }>;
    type: K;
  };
}[Attribute.Kind];
```

The excluded `type` values are unique to the content-manager and as such aren't expected to be rendered as universal form inputs. This data-structure is passed to the `InputRenderer` component to render any form input (previously known as `GenericInputs` from the helper-plugin). Notice how these inputs don't receive their `value`, `onChange` or `error` prop. These are extracted from the `Form` using `useField(name)`:

```ts
export const StringInput = forwardRef<HTMLInputElement, InputProps>(
  ({ disabled, label, hint, name, placeholder, required }, ref) => {
    const field = useField(name);

    return (
      <TextInput
        ref={ref}
        disabled={disabled}
        hint={hint}
        label={label}
        name={name}
        defaultValue={field.initialValue}
        onChange={field.onChange}
        placeholder={placeholder}
        required={required}
        value={field.value}
      />
    );
  }
);
```

To handle the CM specific inputs, the EditView domain has its own `InputRenderer` component which follows the same principle but this will additionally handle attributes like custom-fields etc. The EditView them "simply" renders over its layout, passing props to the `InputRenderer`, if there's a dynamic-zone or component we recursively render the layout by utilising the `components` property of the `EditLayout` data-structure, as previously said, because this follows the same structure as its parent, we can iterate over it the exact same way rendering _any fields_ required, incl. deeply nested components and dynamic-zones.

#### Progressive mounting

[`FormLayout`](https://github.com/strapi/strapi/blob/develop/packages/core/content-manager/admin/src/pages/EditView/components/FormLayout.tsx) does not mount every row of the layout on the first render. The first render depends on the size of the screen, not on the size of the model.

- A row that is not mounted yet renders a placeholder with an estimated height.
- A row mounts when it gets close to the viewport. An `IntersectionObserver` watches its placeholder, with the edit view's scroll container as root.
- The other rows mount in the background, one per idle period (`requestIdleCallback`, inside `startTransition` so that user input interrupts it).
- A row with a field in error mounts right away, so the error is displayed and the field can receive the focus. It stays mounted after the errors are cleared.
- A row with a required UID or a custom field mounts with the page, including when the field is inside a non-repeatable component. These inputs can set a value when they mount: a required UID fetches its default value, and a custom field may set a default.
- Once mounted, a row stays mounted.

Relation fields follow the same idea for their requests. A relation field fetches its connected relations once it gets close to the viewport (`useHasBeenNearViewport`, same margin as the rows), not when it mounts, and searches for the options of its combobox only once the combobox has been opened. After a save, only the fields that have already been near the viewport refetch their relations.

A field in a row that is not mounted yet is not in the DOM. This affects browser search, autofill, end-to-end tests that look for a field low in the form without scrolling, and plugins that query inputs in the DOM. The form values do not depend on mounting: they live in the form state.

### ListView

Because the list view is essentially a giant table, its data-structure is considerably simpler than the edit view:

```ts
interface ListFieldLayout {
  /**
   * The attribute data from the content-type's schema for the field
   */
  attribute: Attribute.Any | { type: 'custom' }; // custom attributes are expected to use `cellFormatter`.
  /**
   * Typically used by plugins to render a custom cell
   */
  cellFormatter?: (
    data: { [key: string]: unknown },
    header: Omit<ListFieldLayout, 'cellFormatter'>,
    meta: { collectionType: string; model: string }
  ) => React.ReactNode;
  label: string | MessageDescriptor;
  /**
   * the name of the attribute we use to display the actual name e.g. relations
   * are just ids, so we use the mainField to display something meaninginful by
   * looking at the target's schema
   */
  mainField?: string;
  name: string;
  searchable?: boolean;
  sortable?: boolean;
}
```

The `cellFormatter` property is paramount to plugin developers being able to inject their own columns, because we, most likely, will not have the components necessary to render the data the plugin provides. This is why they receive the data for the entire row & the header that they injected via the `'Admin/CM/pages/ListView/inject-column-in-table'` hook.

The third argument, `meta`, holds the `collectionType` and `model` of the list view. Its type is exported as `ListCellMeta` from `@strapi/content-manager/strapi-admin`.

:::caution Pass fields, never spread the row
The row is user data. A content type can have attributes named `ref` or `key`. React treats them as the special `ref` and `key` props when you spread the row into a component: a string `ref` crashes the list view ("Function components cannot have string refs") and `key` is dropped. Read the fields your cell needs and pass them explicitly:

```tsx
cellFormatter: (row, _header, { model }) => <MyCell documentId={row.documentId} model={model} />;
```

:::
