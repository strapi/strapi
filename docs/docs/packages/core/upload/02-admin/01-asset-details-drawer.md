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

- **Size**: below the `medium` breakpoint, the panel takes the full width of the screen. From `medium` up, it is anchored to the right with the `width` prop, 400px by default. The asset details drawer passes `41.6rem`.
- **Height**: the panel is capped at `100dvh`, not `100vh`. It is anchored to the bottom, and on mobile the URL bar makes the visible viewport shorter than `100vh`. With `100vh`, the header and the close button would be pushed off screen.
- **Outside presses**: by default, a pointer press outside the panel does not close it. A host opts in with `onPointerDownOutside`, and can still veto a press with `event.preventDefault()`. The asset details drawer opts in, but keeps the panel open when the press lands on an asset card, because that click switches the drawer to the other asset.
- **Focus**: focus that moves outside never closes the panel. The panel is non-modal, so tabbing past the last field is a normal action.
- **Portalled content**: dialogs, popovers and tooltips opened from inside the panel count as inside, because Radix follows the React tree, not the DOM.
- **Escape**: the design system layers do not share the Radix instance of the panel, so an Escape meant for one of them also reaches the panel. Use `onEscapeKeyDown` to veto it. The asset details drawer vetoes Escape from inside the crop editor, which closes the editor instead.

### Stacking

The panel uses the `overlay` z-index token (300). Design system modals put their overlay on the same token. Equal z-index values stack by DOM order, and a portal is appended when it opens:

- A drawer opened from inside a modal, for example a media field in the relation modal of the Content Manager, comes after the modal and sits above it.
- A dialog opened from inside the drawer, for example the delete confirmation, comes after the drawer and covers it.

Do not raise the panel to the `modal` token (310). The content of a design system dialog stacks inside its own overlay at 300, so the drawer would cover its own confirmation dialogs. Popovers (500) and tooltips (1000) stay above the panel.

## Open state lives in the URL

On the page, `useAssetDetailsParam` reads and writes the `assetId` parameter. Opening and closing call `setQuery(params, 'push', true)`. The third argument of `setQuery`, from `useQueryParams` in `@strapi/admin`, is `replace`: the navigation replaces the current history entry instead of adding one.

Opening and closing the drawer therefore add no history entries. The browser Back button returns to the previous location, such as another folder or another admin page, instead of closing the drawer. Use `replace` for any panel whose open state lives in the URL.

Closing removes the parameter, so closing is a navigation. The next section relies on that.

## Unsaved edits

`AssetDetailsDrawer` takes a `guardNavigation` prop. It selects one of two guards:

- **`guardNavigation` is true** (the page): every way to close the drawer removes the URL parameter. That includes the close button, Escape, an outside press, a route change and the browser Back button. `<Blocker>` from `@strapi/admin` intercepts these navigations while the form is modified. Its `onProceed` resets the form, so the held navigation can complete.
- **`guardNavigation` is false** (the field): closing is a state change, which `<Blocker>` cannot see. The `ReportUnsavedEdits` component writes `modified && !isSubmitting` into a ref from a layout effect. `requestClose` reads the ref and opens a confirmation dialog instead of closing.

The second guard uses a ref because only the close handlers read it, so a change of the dirty state does not re-render the drawer. It uses a component because the form state is only available inside the render prop of `<Form>` (see [Forms](./02-forms.md)). The confirmation dialog renders inside the panel, so Radix counts presses on it as inside.

Do not set `guardNavigation` in a host that already renders a `<Blocker>`, such as the Content Manager edit view. React Router allows one blocker per page.

## Feedback inside the drawer

The results of drawer actions, such as save, replace, crop and their errors, render as a design system `Alert` inside the drawer, above the asset preview. They do not go through `useNotification`. The message stays next to the asset it is about, instead of in a corner of the screen.

- Descendants report results through `DrawerNotifyContext` and `useDrawerNotify`, without prop drilling.
- The alert clears after 5 seconds, unless the toast is `persistent`. The "file too large" error of a replace is persistent.
- A successful delete is the exception. It uses the global `toggleNotification`, because the drawer closes right after.

The footer buttons run the replace and delete mutations through `AssetOperationsContext`. It also exposes the pending flags that drive the busy overlay of the drawer.

## Related

- [Forms](./02-forms.md): the form inside the drawer.
- [Testing](./04-testing.md): page objects and locators for the drawer.
