---
title: Forms
description: 'How the Media Library uses the admin Form: reading form state, keeping the save baseline, and gating the save button.'
tags:
  - frontend
---

# Forms

The Media Library uses `Form`, `useForm` and `useField` from `@strapi/admin/strapi-admin`. The form of the [asset details drawer](./02-asset-details-drawer.md), `AssetDetails` in [`AssetDetailsDrawer.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/components/AssetDetails/AssetDetailsDrawer.tsx), is the reference for the patterns below.

## Read form state inside the form

`useForm` reads the form context, and the context has default values. Outside `<Form>`, reading the state does not throw: it returns the defaults, and `modified` stays `false` forever. A save button gated on that value never enables. Calling an action of the default context, such as `onChange` or `resetForm`, throws.

The component that renders `<Form>` is outside the context. It reads the state through the function child of `Form`:

```tsx
<Form method="POST" initialValues={initialValues} onSubmit={handleSubmit}>
  {({ modified, isSubmitting, values, resetForm }) => (
    <>
      <FormBody />
      <Button type="submit" disabled={!modified || isSubmitting}>
        Save
      </Button>
    </>
  )}
</Form>
```

`method` is required. `Form` passes `modified`, `disabled`, `onChange`, the form state (`values`, `errors`, `isSubmitting`), `setErrors` and `resetForm`. Components rendered inside `<Form>` can call `useForm` directly. For example, `DetailField` reads `isSubmitting` with `useForm`.

The same rule applies to `<Blocker>`. It reads `modified` with `useForm`, so render it inside `<Form>`. Outside the form, it sees `false` and never blocks.

## Update fields with the path form of `onChange`

Call `onChange(name, value)` with the field path and the value. Do not pass the change event. The event form turns `''` into `null`, so a field that starts as `''` stays modified after the user types a character and deletes it. `DetailField` calls `field.onChange(name, value)` for this reason.

## Keep `initialValues` stable

`Form` applies `initialValues` again when the prop changes identity and its content differs from the current baseline. After a save, the baseline is the saved values, while the prop still holds the asset from before the save until the refetch arrives. A new `initialValues` object on every render would reset the form to the old values.

`AssetDetails` builds `initialValues` with `React.useMemo` on the asset fields, so the object only changes when the asset does.

## Reset the baseline after a save

`handleSubmit` calls `resetForm(values)` after a successful update. The saved values become the new baseline. Without this call, the form stays modified until the refetched asset arrives, and closing the drawer in that gap asks about edits that are already saved.

`<Form>` has `key={asset.id}`. When the drawer switches to another asset, the form remounts, so values of the previous asset do not leak into the next one.

## Save button gating

The save button is disabled when any of these is true:

- `!modified`: there are no edits.
- `isSubmitting`: the mutation is in flight.
- The file name is empty. The check trims the value, so a name made of spaces counts as empty.

```tsx
const nameIsEmpty = ((values as AssetFormState).name ?? '').trim() === '';

<Button type="submit" disabled={!modified || isSubmitting || nameIsEmpty} />;
```

This gate is the only check on the name. The admin route `PUT /upload/files/:id` validates `name` as a nullable string, and the upload service saves any value that is not `null` or `undefined`, an empty string included.

`DetailField` shows a warning icon next to an empty field, with a tooltip from the `asset-details.field.empty` translation. The icon checks the value without trimming it, so a name made of spaces disables the save button but shows no icon.
