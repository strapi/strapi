# Drawer

The `AssetDetailsDrawer` is the densest component in this tree. These are
the four decisions that bit us during CMS-123 / CMS-124. Read this before
making any non-trivial drawer change.

## Z-index is literal `200`

`AssetDetailsDrawer.tsx` sets z-index to the bare number `200`, **not**
`theme.zIndices.dialog`. The Strapi theme ladder is:

| Layer             | z-index |
| ----------------- | ------- |
| navigation        | 100     |
| **drawer (here)** | **200** |
| overlay           | 300     |
| modal             | 310     |
| dialog            | 320     |
| popover           | 500     |
| notification      | 700     |
| tooltip           | 1000    |

The drawer must sit **below** the `AlertDialog` overlay (300) so confirm
dialogs render above it, AND **below** the popover layer (500) so the
Location `SingleSelect` portal renders above. Bumping to
`theme.zIndices.dialog` (320) hides the folder list inside the Location
select.

The literal in the code has a one-line comment pointing here.

**Rule of thumb**: when adding portalled UI inside the drawer (selects,
popovers, dialogs, tooltips), make sure the radix z-index is higher than 200. Don't "fix" the drawer z-index by aligning it with the theme.

## In-drawer toasts, not DS Notifications

Success / error feedback for drawer actions (Save, Delete, Replace) renders
as a custom DS `Alert`, positioned `absolute` above the image preview,
inside the drawer. **Not** through `useNotification` / DS Notifications.

**Why**: Adrien wants the confirmation scoped to the drawer ("above the
image preview"), not at the bottom-right of the screen. We tried `position:
sticky` first — it shifted content when the toast appeared; switched to
`position: absolute` with the form `position: relative`.

**Rule of thumb**: any new drawer action should hook into the existing
in-drawer Alert state. If the trigger lives inside the `Form` body, lift
state via the close-guard context's `setDirty` from the `<Form>` render
prop (see [forms.md](forms.md)). Don't reach for `useNotification` for
drawer-scoped feedback.

## Browser Back must return to the previous URL

`useAssetDetailsParam.openDetails` (and the close path) call
`setQuery(params, 'push', true)` — the third arg is `replace`. This swaps
the current history entry instead of pushing a new one.

**Why**: drawer open/close is encoded in a URL search param. With a regular
`push`, hitting Back closes the drawer but stays on the same page. Adrien
wants Back to return to wherever the user came from (a folder, a search
result, another section of the admin).

**Rule of thumb**: any new drawer / modal whose open state lives in the
URL should use `replace: true` for the same reason.

## Discard guard

Closing the drawer with unsaved changes must prompt the user before
discarding. The pattern (a `CloseGuardContext` provided by
`AssetDetailsDrawer`):

- `isDirtyRef` (`useRef`) mirrors the latest `modified` from the `Form`
  — synchronous read in the close handler, no re-renders per keystroke.
- The `<Form>` render prop calls `guard.setDirty(modified)` to feed the
  ref (no bridge component — see [forms.md](forms.md)).
- `guard.requestClose()` checks `isDirtyRef.current` and either closes or
  opens the discard `AlertDialog`.
- `guard.forceClose()` skips the prompt (used after a delete, where unsaved
  edits are moot).
- Close triggers (header X, `Drawer.Root onClose`) call `requestClose`;
  deep descendants read the guard from context instead of prop drilling.

See `AssetDetailsDrawer.tsx` for the canonical wiring.
