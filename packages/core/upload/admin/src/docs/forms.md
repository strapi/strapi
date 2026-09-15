# Forms

We use `@strapi/admin/strapi-admin`'s `Form` + `useField` + `useForm`.

## Read `modified` / `values` from outside the Form body

`useForm` only works **inside** the form context. Calling it in the same
component that renders `<Form>` (before the `<Form>` in the JSX) returns the
default state forever — `modified` stays `false`, so a Save button gated on
it never enables. This was a real bug in `AssetDetails`. Use the render prop
instead.

### Preferred — children-as-function

`Form` accepts a function child and passes `{ modified, disabled, onChange,
...state }` (state includes `isSubmitting`, `values`):

```tsx
<Form initialValues={...} onSubmit={...}>
  {({ modified, isSubmitting }) => (
    <>
      <FormBody />
      <Button type="submit" disabled={!modified || isSubmitting}>Save</Button>
    </>
  )}
</Form>
```

### Lifting dirty state to a parent (e.g. a close guard)

When a parent that owns `<Form>` needs the dirty flag (the drawer's
discard-on-close prompt), expose a `setDirty` from a context and call it
from inside the render prop — a **ref write during render**, no bridge
component, no effect:

```tsx
const { setDirty } = useCloseGuard(); // ctx provides isDirtyRef + requestClose

<Form ...>
  {({ modified }) => {
    setDirty(modified); // mutates a ref; idempotent, read only on close
    return <>...</>;
  }}
</Form>
```

The parent stores `modified` in a `useRef` so synchronous handlers (like
`requestClose`) read it without re-rendering. A `FormDirtyBridge` component
that hosts a `useEffect` works too, but it's a whole component for one
effect — the render-prop write is leaner. Reviewed and chosen on CMS-124.

## Don't split a form into a wrapping container + a button child component

A natural-looking refactor is to move the Save button into its own
component so it can call `useForm` itself. That was tried in CMS-123
review and reverted — it added a component for no real reason. **Inline
the logic in the parent instead** via children-as-function.

> _Feedback recorded from review: "I didn't ask you to move the SaveButton
> in another component. It's useless and it can be put directly in the
> parent."_

## Save button gating

Disable when any of:

- `!modified` (no edits yet)
- `isSubmitting` (mutation in flight)
- a required field is empty

For name-style fields, compare with `.trim() === ''` so whitespace doesn't
count:

```tsx
const nameIsEmpty = ((values as AssetFormState).name ?? '').trim() === '';
disabled={!modified || isSubmitting || nameIsEmpty}
```

Add a tooltip on the disabled button explaining why (translation key
`asset-details.field.empty` for the empty-name case).
