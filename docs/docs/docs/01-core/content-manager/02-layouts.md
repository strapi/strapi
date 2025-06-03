---
title: Layouts
description: How layouts work with the List & Edit view
tags:
  - content-manager
  - layouts
  - edit-view
  - list-view
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

The excluded `type` values are unique to the content-manager and as such aren't expected to be rendered as universal form inputs. This data-structure is passed to the `InputRenderer` component to render any form input (previously known as `GenericInputs` from the helper-plugin). Notice how these inputs don't recieve their `value`, `onChange` or `error` prop. These are extracted from the `Form` using `useField(name)`:

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

### ListView

Because the list view is essentailly a giant table, its data-structure is considerably simpler than the edit view:

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
    header: Omit<ListFieldLayout, 'cellFormatter'>
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
