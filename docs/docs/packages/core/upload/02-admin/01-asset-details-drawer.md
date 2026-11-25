---
title: Asset details drawer
description: 'How the asset details drawer stacks, keeps its open state in the URL, guards unsaved edits and reports results.'
tags:
  - frontend
---

# Asset details drawer

The asset details drawer shows one asset. It edits the name, the alternative text, the caption and the folder, and it replaces, crops, downloads and deletes the asset. The code is in [`AssetDetailsDrawer.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/pages/Assets/components/AssetDetails/AssetDetailsDrawer.tsx).

Two hosts render it:

- The Media Library page renders `AssetDetailsDrawerFromUrl`. The open asset is the `assetId` URL parameter, so a link to an asset survives a refresh.
- The `media` field in `components/MediaLibraryInput/MediaLibraryInput.tsx` renders `AssetDetailsDrawer`. The open asset is local state of the field.

## The drawer shell

The panel is the shared `Drawer` from [`components/Drawer.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/components/Drawer.tsx). The upload progress dialog uses it too. It wraps a non-modal Radix `Dialog`.

- **Width**: below the `medium` breakpoint, the panel takes the full width of the screen. From `medium` up, it is anchored to the right with the `width` prop, 400px by default. Both current callers pass `41.6rem`.
- **Height**: `maxHeight` defaults to `100dvh`, not `100vh`. The panel is anchored to the bottom, and on mobile the URL bar makes the visible viewport shorter than `100vh`. With `100vh`, the header and the close button would be pushed off screen. The asset details drawer also sets `height="100dvh"`. The upload progress dialog passes `maxHeight="34.2rem"`.
- **Outside presses**: by default, a pointer press outside the panel does not close it. A host opts in with `onPointerDownOutside`, and can still veto a press with `event.preventDefault()`.
- **Focus**: focus that moves outside never closes the panel. The panel is non-modal, so tabbing past the last field is a normal action.
- **Portalled content**: dialogs, popovers and tooltips opened from inside the panel count as inside, because Radix follows the React tree, not the DOM.
- **Escape**: `onEscapeKeyDown` lets a host veto Escape with `event.preventDefault()`.

The asset details drawer uses these hooks as follows:

- It opts in to outside presses. It keeps the panel open for a press with a button other than the primary one, for a press while the panel is closing, and for a press on a grid card or table row of the page, because that click switches the drawer to the other asset. A press on the checkbox or actions menu of a card still closes it. The cards of the media field do not switch the drawer, so there a press on another asset closes it, or asks first.
- It vetoes Escape when the event comes from the crop editor. The editor is a design system `Portal` with a `FocusTrap`, which handles Escape itself to close the editor. Without the veto, the same key press would also close the drawer.
- On open, it stores the element that had focus, such as the card or the edit button of the field. On close, it gives the focus back to that element, unless the user already moved the focus somewhere else.
- `useDrawerPresence` keeps the drawer mounted until its close animation ends, and keeps the last asset id, so the content does not go blank during the slide-out.

### Stacking

The panel uses the `overlay` z-index token (300). Design system modals put their overlay on the same token. Equal z-index values stack by DOM order, and a portal is appended when it opens:

- A drawer opened from inside a modal, for example a media field in the relation modal of the Content Manager, comes after the modal and sits above it.
- A dialog opened from inside the drawer, for example the delete confirmation, comes after the drawer and covers it.

Do not raise the panel to the `modal` token (310). The content of a design system dialog stacks inside its own overlay at 300, so the drawer would cover its own confirmation dialogs. Popovers (500) and tooltips (1000) stay above the panel.

## Open state lives in the URL

On the page, `useAssetDetailsParam` reads and writes the `assetId` parameter. Opening and closing call `setQuery(params, 'push', true)`. The third argument of `setQuery`, from `useQueryParams` in `@strapi/admin`, is `replace`: the navigation replaces the current history entry instead of adding one.

Opening and closing the drawer therefore add no history entries. The browser Back button returns to the previous location, such as another folder or another admin page, instead of closing the drawer. Use `replace` for any panel whose open state lives in the URL.

Build the parameters with `withEncodedUserParams` from `@strapi/admin`, as `useAssetDetailsParam` does. `setQuery` merges the current query and writes it with `encode: false`, and the query it reads is decoded. `withEncodedUserParams` encodes the `filters` and `_q` values of the current query again before they are written back.

Closing removes the parameter, so closing is a navigation. The next section relies on that.

## Unsaved edits

`AssetDetailsDrawer` takes a `guardNavigation` prop. It selects one of two guards:

- **`guardNavigation` is true** (the page): every way to close the drawer removes the URL parameter. That includes the close button, Escape, an outside press, a route change and the browser Back button. `<Blocker>` from `@strapi/admin` intercepts these navigations while the form is modified.
- **`guardNavigation` is false** (the field): closing is a state change, which `<Blocker>` cannot see. The `ReportUnsavedEdits` component writes `modified && !isSubmitting` into a ref from a layout effect. `requestClose` reads the ref and opens a confirmation dialog instead of closing.

When the user confirms, the blocker lets the navigation through by itself. Its `onProceed` also resets the form. The form stays mounted during the slide-out, and while it is modified it would block the next navigation and keep the unload and session expiry warnings active.

The second guard keeps the dirty state in a ref because only the close handlers read it, so a change of the dirty state does not re-render the drawer. The ref and `requestClose` live in `AssetDetailsDrawer`, above `<Form>`, so a small component rendered inside the function child of `<Form>` reports the state up (see [Forms](./02-forms.md)). The confirmation dialog renders inside the panel, so Radix counts presses on it as inside.

Only `<Blocker>` warns when the user reloads or closes the tab, and when the session expires. The field uses the second guard, so it has neither warning.

Do not set `guardNavigation` in a host that already renders a `<Blocker>`, such as the Content Manager edit view. React Router supports one active blocker per router. When two are mounted, it warns and only checks the last one, so a drawer `<Blocker>` would replace the one of the edit view.

### One drawer across media fields

An entry can have several media fields. [`components/MediaLibraryInput/openAssetDetails.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/upload/admin/src/components/MediaLibraryInput/openAssetDetails.ts) keeps a module-level set of the fields that have a drawer open. A field does not open its drawer or its add menu while any field has a drawer open, because the press that would open it is the press that closes the other drawer. The set is read when the event happens, and a layout effect updates it, so a drawer that a press closes leaves the set before the click reaches the next field.

## Feedback inside the drawer

The results of drawer actions, such as save, replace, crop and their errors, render as a design system `Alert` inside the drawer. They do not go through `useNotification`. The message stays next to the asset it is about, instead of in a corner of the screen.

- The handlers of the drawer call its `notify` function. Buttons deeper in the tree, such as copy link and download, reach it through `DrawerNotifyContext`.
- The slot holds one alert. A new alert replaces the previous one, and switching to another asset clears it.
- The alert clears after 5 seconds, unless the toast is `persistent`. The "file too large" error of a replace is persistent.
- The alert floats over the top of the form (absolute position, z-index 10). The busy overlay (z-index 20) covers it while an action runs.

Two results use the global `toggleNotification` instead:

- A successful delete, because the drawer closes right after.
- A crop export failure in `AssetCropEditor.tsx`, when the editor cannot produce the cropped file.

The Delete and Replace buttons read their functions and pending flags from `AssetOperationsContext`, and disable themselves while an operation runs. The busy overlay reads the mutation hooks directly, including the upload of a cropped copy.

## Related

- [Forms](./02-forms.md): the form inside the drawer.
- [Testing](./04-testing.md): page objects and locators for the drawer.
