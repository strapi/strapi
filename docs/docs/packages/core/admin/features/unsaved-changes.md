---
title: Unsaved changes
description: 'How the admin panel warns before navigation, tab close, session expiry or a modal close discards unsaved edits.'
tags:
  - frontend
---

## What it does

The admin panel has four guards that stop the user from losing edits without warning. Each guard covers a different way to leave a form.

| Guard                     | Covers                                       | Source                                                                                                                                                                                                                                                                         |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Blocker`                 | In-app navigation to another route           | [`components/Form.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/components/Form.tsx)                                                                                                                                                       |
| `useWarnIfUnsavedChanges` | Closing or reloading the browser tab         | [`hooks/useWarnIfUnsavedChanges.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/hooks/useWarnIfUnsavedChanges.ts)                                                                                                                             |
| Unsaved changes registry  | Session expiry, before auth state is cleared | [`utils/unsavedChangesRegistry.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/utils/unsavedChangesRegistry.ts), read in [`features/Auth.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/features/Auth.tsx) |
| `UnsavedChangesModal`     | Dismissing a modal that holds a form         | [`components/UnsavedChangesModal.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/components/UnsavedChangesModal.tsx)                                                                                                                         |

A Strapi `Form` with a `Blocker` inside it drives the first three. The modal guard is separate, because a modal is closed without leaving the page.

All guards use the same idea of "unsaved": the form is modified and is not submitting. `Blocker` registers with the session-expiry registry even while submitting, because a session that dies mid-save leaves the edits unsaved.

## Modal guard

`UnsavedChangesModal` is a drop-in replacement for the design-system `Modal.Root`. It is exported from `@strapi/admin/strapi-admin` and `@strapi/strapi/admin`.

```tsx
<UnsavedChangesModal open={open} onOpenChange={setOpen}>
  <Modal.Content>…</Modal.Content>
</UnsavedChangesModal>
```

### Two ways to close

- **Guarded.** Everything Radix treats as a dismissal ends in `onOpenChange(false)`: Escape, a click outside, the header close button and `Modal.Close`. The guard intercepts that call. If anything is dirty, it opens a confirmation dialog instead and only calls `onOpenChange(false)` after the user confirms. A guarded Cancel button is a `Modal.Close`.
- **Unguarded.** The parent sets `open` to `false` itself. Save handlers do this after a successful submit, so they never ask.

Work that must run when the user leaves (resetting local state, for example) belongs in the `onOpenChange(false)` handler, so it runs after the confirmation and not before.

`open` is required. In uncontrolled mode Radix closes itself before it calls `onOpenChange`, so the close could not be cancelled.

### Registering unsaved changes

The guard keeps a registry of dirty flags. The modal asks before closing if any flag is true.

| Form state                                          | How it registers                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| Strapi `Form` inside the modal                      | Automatically: `Form` calls `useUnsavedChangesModalDirty` itself. |
| Formik form inside the modal                        | Render `<FormikUnsavedChangesRegistrar />` inside `<Formik>`.     |
| Local state in a component inside the modal         | Call `useUnsavedChangesModalDirty(isDirty)`.                      |
| State owned by the component that renders the modal | Pass `hasUnsavedChanges` to `UnsavedChangesModal`.                |

`useUnsavedChangesModalDirty` does nothing when there is no `UnsavedChangesModal` above it. This is how a page-level `Form` that renders a modal stays out of the modal's registry: the page form sits above the guard, so it sees no guard. Only forms rendered inside the modal register.

### Content-manager document actions

`DocumentActionModal` renders `UnsavedChangesModal`. The `onClose` passed to a modal action's `content` and `footer` stays an unguarded close, so existing actions keep closing after they succeed. Content that wants a guarded Cancel uses `Modal.Close` and registers its own dirty flag.
