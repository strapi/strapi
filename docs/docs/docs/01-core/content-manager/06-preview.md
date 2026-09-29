---
title: Live preview
description: Frontend-agnostic preview with visual editing
tags:
  - content-manager
---

The live preview feature lets users see their content rendered on their frontend while editing. It includes visual editing that identifies and highlights editable fields.

## Why not an SDK

Visual editing requires running some of our code on the user's frontend to detect fields and draw highlights. The obvious approach would be an SDK package users install in their project. We intentionally avoided this.

An SDK would require ongoing maintenance and create version mismatch risks between the SDK and Strapi. It would also tie us to specific frameworks or require multiple framework-specific packages.

Instead, the preview script is defined inside Strapi and sent to the frontend via `postMessage`. The frontend just needs a small snippet to receive and execute it. This keeps the script always in sync with the CMS version, works with any framework, and requires no package installation.

## How the script works

### Self-contained constraint

The preview script (`packages/core/content-manager/server/src/preview/controllers/previewScript.js`) is served verbatim from a server endpoint (`GET /content-manager/preview/script`). The admin fetches it, wraps it with its runtime config, and posts the result to the iframe:

```ts
const previewScriptSource = await fetch(
  `${window.strapi.backendURL}/content-manager/preview/script`
).then((res) => res.text());
const config = {
  colors: previewHighlightColors,
  events: INTERNAL_EVENTS,
  parentOrigin: window.location.origin,
};
const script = `(${previewScriptSource})(${JSON.stringify(config)})`;
```

Because of this, it **cannot import dependencies or reference external variables**. All logic must be self-contained. The only external code (`@vercel/stega` for decoding) is loaded dynamically from a CDN at runtime.

It lives in a standalone `.js` file served as-is rather than being bundled with the admin: a bundler wraps the module in helper code that breaks once the function is stringified and injected into the iframe. The file is still type-checked via `@ts-check` and JSDoc.

This is why the file has an unusual structure with many functions defined inline.

### Field identification with stega

We use [stega encoding](https://github.com/vercel/stega) to identify which Strapi field each piece of text comes from. Stega embeds invisible metadata into text content using Unicode zero-width characters that are imperceptible to users but can be decoded programmatically.

1. The Document Service encodes field metadata into text values (invisible to users)
2. The frontend renders the content normally
3. The preview script decodes the metadata and attaches `data-strapi-source` attributes to DOM elements
4. Highlights are drawn over elements with source attributes

The metadata uses URL search params format, because it makes it easy to encode and decode multiple pieces of information into a single string: `path=title&type=string&documentId=abc123&locale=en&model=api::page.page`

### Stega limitations

Stega can only encode strings. This means:

- **Numbers and booleans aren't encoded** — we can't modify their type in the response.
- **Fields inside components and dynamic zones work** — we encode individual string fields within them, not the parent object. The path includes indices (e.g., `components.2.title`) to identify the exact field.
- **Media fields work partially** — the string properties inside media objects (like `url`, `name`, `alternativeText`) get encoded when traversed.

Blocks fields hold a JSON AST rather than a plain string, so they can't use the standard stega encoding. They use a dedicated path described in [Blocks visual editing](#blocks-visual-editing) below.

### Communication protocol

The admin panel and preview iframe communicate via `postMessage`.

```mermaid
sequenceDiagram
    participant Admin
    participant Iframe as Preview Iframe
    participant Host as Host App (window)

    Note over Admin,Iframe: Initialization (public events)
    Iframe->>Admin: previewReady
    Admin->>Iframe: strapiScript

    Note over Admin,Iframe: User edits in admin panel (internal events)
    Admin->>Iframe: strapiFieldFocus
    Admin->>Iframe: strapiFieldBlur

    Note over Admin,Iframe,Host: Blocks field change (public event — admin→iframe postMessage, then script→host CustomEvent)
    Admin->>Iframe: strapiFieldChange (postMessage)
    Iframe->>Host: strapiFieldChange (CustomEvent on window)

    Note over Admin,Iframe: User clicks in preview (internal events)
    Iframe->>Admin: strapiFieldSingleClickHint
    Iframe->>Admin: strapiFieldFocusIntent (double-click, includes blockIndex for blocks fields)

    Note over Admin,Iframe: After editing closes (internal event)
    Admin->>Iframe: strapiRescanHighlights

    Note over Admin,Iframe: Content saved (public event)
    Admin->>Iframe: strapiUpdate
```

Public events (`previewReady`, `strapiScript`, `strapiUpdate`, `strapiFieldChange`) are documented to users—changing them is a breaking change.

Internal events (for field focus/blur synchronization) are defined in `packages/core/content-manager/admin/src/preview/utils/constants.ts` and can be changed freely since we control both ends.

### Frontend configuration

Users can configure the preview behavior from their frontend via `window` globals, without modifying Strapi:

- `window.STRAPI_DISABLE_STEGA_DECODING` - disable field detection entirely. When true, users need to write the `data-strapi-source` attribute manually for fields to be editable
- `window.STRAPI_HIGHLIGHT_HOVER_COLOR` - customize hover highlight color
- `window.STRAPI_HIGHLIGHT_ACTIVE_COLOR` - customize active highlight color

## Blocks visual editing

Blocks fields hold a JSON AST, so their content can't use the stega string encoding that other field types rely on. They use a dedicated flow: the server encodes lightweight stega markers into the text leaves of the AST, and double-clicking the rendered field opens the regular `InputPopover` with the cursor pre-positioned at the clicked block.

### Stega encoding for blocks

The server-side content-source-maps service (`packages/core/core/src/services/content-source-maps.ts`) has a dedicated `encodeBlocks` pass over the blocks AST. Instead of encoding every text node, it injects **one stega marker per visual block**:

- `paragraph`, `heading`, and `quote` nodes: the first `{ type: 'text' }` leaf in the subtree.
- `list` nodes: the first text leaf of each list item (recursively for nested lists).
- `image` nodes: the `alternativeText` string field, when non-empty (encoded into the `alt` attribute — the preview script decodes this to detect image blocks). The `url` field is intentionally **not** encoded because stega-encoding it corrupts the `src` attribute and can cause the preview highlight to expand across the full page. Image blocks with no `alternativeText` receive no stega marker; the blocks field is still highlightable via its text blocks.
- `code` blocks are **skipped** — encoding their content would corrupt the syntax.

All markers within one blocks field share both the same `fieldPath` key (e.g., `fieldPath=content`) and the same `path` key — `blocksFieldMetadata` sets `path = fieldPath` for every marker. The presence of `fieldPath` in the source attribute is what distinguishes blocks markers from regular string-field markers, and the preview script uses it as the group key to cluster all markers into one highlight.

### Highlight grouping

The `deriveGroupKey` function in the preview script detects the presence of `fieldPath` in a `data-strapi-source` attribute and strips `path` from the group key, so all encoded spans within one blocks field share a single `HighlightGroup`.

The bounding box of that group is computed in `computeGroupRect`, via `getBlocksContainer`. `getBlocksContainer` trusts an already-established, still-attached container for the group without re-checking it — it only runs the guarded discovery below when there's no cached container yet. This matters because live edits can legitimately dwarf a field's currently-marked content (e.g. typing an image into a field whose only marked content is a short paragraph); re-validating on every redraw would otherwise reject the still-correct container and collapse the highlight. The cache is populated by `syncContainerObservation` (see [Live container resize](#live-container-resize)) and shared with `findBlockIndex`.

Fresh discovery (`findBlocksContainer`), run only when there's no cached container:

1. Walk up the DOM from the first span in the group looking for an ancestor whose direct children include a block-level tag (`P`, `H1`–`H6`, `UL`, `OL`, `BLOCKQUOTE`, `PRE`), skipping `LI`, `UL`, and `OL` elements themselves — a list item can have a nested `<ul>`/`<ol>` as a direct child (which would satisfy the check but is not the container), and `@strapi/blocks-react-renderer` places nested lists directly inside `<ul>`/`<ol>` rather than wrapped in an `<li>`, so list containers also need to be skipped as candidates.
2. Reject the candidate if its area is more than `MAX_CONTAINER_AREA_RATIO` (6x) larger than the union of the group's own marked elements — this stops an image-only field (no block-level tags of its own) from escaping into an unrelated, page-level ancestor and swallowing the whole page.
3. Use the container's `getBoundingClientRect()` as the highlight rect. This includes container padding and empty trailing blocks that have no stega spans.
4. Fallback (if no container is found): union of all span rects plus an 80 px bottom buffer so that empty trailing blocks remain clickable.

### Live container resize

Live edits never carry a stega tag until the field is saved, so growing or shrinking content inside an already-open blocks field (typing a new paragraph, adding an image) doesn't touch any marked span — nothing signals the highlight manager that a redraw is needed. `syncContainerObservation` covers this gap: whenever a group's container is (re)established, a shared `containerResizeObserver` (`ResizeObserver`) watches it, and any resize triggers `updateAllHighlights()`.

`containerResizeObserver` is disconnected in `__strapi_previewCleanup` alongside the other observers. Since the preview script re-runs on every iframe navigation and `strapiScript` re-injection, leaving it connected would leak one live observer — still pinning its watched DOM node — per re-run.

### Double-click flow

Double-clicking a blocks field highlight opens the editor at the clicked block.

1. The preview script picks the element at the click point via `pickElementAtPoint`, which reports whether it was an **exact** hit (inside a _marked_ element's own rect) or a fallback to the nearest marked element (only good for "which field", not "which block").
   - **Exact hit**: `findBlockIndex(anchor, groupKey, group)` resolves the block index — it gets the field's container via `getBlocksContainer`, walks up from the clicked span until its parent is the container, and returns the DOM child index of that element. The full `children` list (not filtered by tag name) is used so that empty paragraphs (`<br>`) and other non-standard elements don't cause index drift.
   - **No exact hit**: the click landed on something unmarked — a code block or alt-less image (never marked, by design), or content rendered from a live, unsaved edit (not marked yet, since nothing is stega-encoded until the field is saved). Either way, `findBlockIndex` doesn't actually need a marker — it only needs a genuine DOM descendant of the field container to walk up from. The script finds the real clicked element with `document.elementsFromPoint` (skipping past the highlight overlay itself, which is what actually received the click) and resolves its block index the same way as an exact hit. This is different from falling back to the nearest _marked_ sibling (which is only reliable for "which field", not "which block", and is what the fallback anchor above is still used for — path/popover position, not block index).
2. For the popover trigger position the script uses the clicked element's rect — not the full group rect — so the popover opens adjacent to the clicked line. If the stega span is zero-width (invisible chars only), it walks up to the nearest visible ancestor.
3. `strapiFieldFocusIntent` is sent with the `path` set to the `fieldPath` value (the blocks field path) and `blockIndex` in the payload — a number, or `null` when it couldn't be resolved (see above).
4. `InputPopover` receives the message and calls `setPopoverField` with both the field metadata and the `blockIndex`.
5. `InputPopoverProvider` makes `blockIndex` available via `usePreviewPopoverBlockIndex()` to all inputs rendered inside the popover.
6. `InputRenderer` picks up `blockIndex` and passes it — along with `livePreviewSync={true}` — to `BlocksInput` → `BlocksEditor`.
7. `BlocksEditor`'s `blockIndex` effect runs on mount: it calls `Transforms.select(editor, Editor.start(editor, [targetIndex]))` to position the Slate cursor (clamped to the last block if the index is out of range) and focuses the editor. `Editor.start` — rather than a literal `[targetIndex, 0]` path — resolves the actual first valid text point inside that block, which matters for blocks whose first child isn't a plain text leaf (list items, headings with nested inline formatting). A `requestAnimationFrame` callback then scrolls that block into view inside the editor's scroll container.

### Live sync

When a blocks field is rendered inside an `InputPopover`, `InputRenderer` passes `livePreviewSync={true}` to `BlocksEditor`. In this mode `onChange` fires synchronously on every Slate operation instead of being debounced by 300 ms. This keeps the form state current so that an immediate Save after typing doesn't lose the last few keystrokes.

`autoFocus` is set to `true` only when `blockIndex` is `null` (i.e., the field was opened by clicking on an empty area with no block identified). When `blockIndex` is a number, the `blockIndex` effect handles both cursor positioning and focus.

### Rescan after editing

Live-preview sync updates the iframe DOM while the popover is open (the host app re-renders its `BlocksRenderer` on each `strapiFieldChange`). This can change the rendered height of the blocks field, making the group highlight stale.

When `popoverField` transitions from a non-null value back to `null` (the popover closed), `Preview.tsx` posts `strapiRescanHighlights` to the iframe. The preview script handles this message by scheduling `highlightManager.rescan()` via `requestAnimationFrame`, which:

1. Prunes any `data-strapi-source` elements that were removed from the DOM during editing.
2. Registers any new elements that appeared (e.g., newly created blocks).
3. Redraws all highlight positions and sizes.

The `requestAnimationFrame` delay lets any in-flight React renders in the iframe commit before the rescan runs.

### Live update integration for host apps

While the popover is open, the admin fires `strapiFieldChange` on every keystroke. `strapiFieldChange` is a **public event** — its name is stable and host apps can depend on it without risk of a breaking change.

The preview script re-dispatches it as a CustomEvent on the iframe `window` so host apps don't need to deal with the `postMessage` origin checks themselves:

```js
// Preferred: CustomEvent dispatched by the preview script on the iframe window
window.addEventListener('strapiFieldChange', (e) => {
  const { field, value } = e.detail;
  // update your local state with the new blocks AST
});

// Alternative: raw postMessage received in the iframe from the admin parent
window.addEventListener('message', (e) => {
  if (e.data?.type === 'strapiFieldChange') {
    const { field, value } = e.data.payload;
    // update your local state with the new blocks AST
  }
});
```
