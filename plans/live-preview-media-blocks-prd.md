# PRD: Live Preview support for Media and Blocks fields

Status: Draft
Owner: Mark Kaylor
QA target: LaunchPad (`/Users/markkaylor/dev/LaunchPad`)

---

## Problem Statement

Strapi's Live Preview updates simple string-based fields (string, text, richtext) in place — a user edits the field in the admin form and the preview iframe reflects the change without a full page reload. Two of the most commonly edited field types do not behave this way today:

- **Media fields** (images, videos, files) — swapping an image, changing alt text, or replacing a video does not update the preview in place. The preview only updates after the integrator's site is told to do a full refresh.
- **Blocks fields** (rich content blocks) — editing the text inside a block, adding a block, removing a block, or reordering blocks does not update the preview in place.

From the content editor's perspective this feels inconsistent and slow. Every media tweak and every block edit forces a noticeable reload, loses scroll position, and breaks the "what you see is what you get" loop that makes live preview valuable in the first place.

The root cause is that the current mechanism (stega-encoded source maps embedded as zero-width characters inside string values) only works for primitive strings. Media is a JSON object. Blocks is a JSON tree. Neither can have metadata "hidden" inside them the way a plain string can, and the current preview script only knows how to patch text content when a change comes in.

## Solution

Extend Live Preview so that editors can change media and blocks in the admin and see those changes reflected in the preview iframe without a full page reload, using the same edit-to-preview feedback loop that already exists for text fields.

Two complementary update primitives cover the full range of edits:

1. **In-place patch.** When an edit does not change the shape of the rendered DOM (swapping one image for another image, changing alt text, editing text inside an existing block), the preview script updates the relevant attributes or text nodes on the matched element. No network activity, no reflow beyond the element itself.
2. **Scoped refresh.** When an edit _does_ change the shape of the rendered DOM (swapping an image for a video, adding or removing a block, reordering blocks), the preview script dispatches the new field value to an integrator-registered renderer for that field's subtree. No full-page reload.

Strapi ships sensible built-in defaults so that the common cases require zero integrator code. A minimal opt-in contract (`window.strapiPreview`) lets integrators customize rendering when their site does something non-standard.

This PRD is structured as a **tracer-bullet** delivery: the first slice ships in-place media patching end to end (server → admin → preview script → LaunchPad wrapper), proving the architecture. Subsequent slices extend the same machinery to cover blocks text edits, structural edits, and the full public API.

## User Stories

### Content editor

1. As a content editor, I want to swap an image in a media field and see the new image appear in the preview iframe without a full reload, so that I can iterate on visual choices quickly.
2. As a content editor, I want to edit the alt text of an image and see it reflected in the preview, so that I can verify accessibility copy in context.
3. As a content editor, I want to swap an image for a video in the same media field and see the preview reflect the new media type, so that I can experiment with richer formats without losing scroll position.
4. As a content editor, I want to clear a media field and see the preview update to reflect the empty state, so that I can verify layouts that depend on media being optional.
5. As a content editor, I want to add a new image to an empty media field and see it appear in the preview, so that I can build up a page without reloading after each addition.
6. As a content editor, I want to edit text inside a block (paragraph, heading, list item) and see the preview update in place, so that copy iterations feel immediate.
7. As a content editor, I want to add a new block to a blocks field and see it appear in the preview, so that I can compose content organically.
8. As a content editor, I want to remove a block and see it disappear from the preview, so that I can clean up layouts without a reload interrupting my flow.
9. As a content editor, I want to reorder blocks and see the new order in the preview, so that I can refine narrative structure visually.
10. As a content editor, I want to change a block's type (paragraph to heading, for instance) and see it reflected in the preview, so that styling experiments are fast.
11. As a content editor, I want the preview to keep my scroll position when media or blocks change, so that I do not lose my place while editing long pages.
12. As a content editor, I want focus/blur highlighting to continue to work for media and blocks fields, so that I know which field I am editing in the preview.
13. As a content editor, I want media and blocks edits to not cause a visual flicker in the preview, so that the experience feels polished.
14. As a content editor, I want all existing live preview behavior for text, richtext, and component fields to continue working unchanged, so that nothing I rely on today regresses.

### Integrator (building or maintaining a preview-enabled site)

15. As an integrator, I want media and blocks live preview to work out of the box for a default Strapi site, so that I do not have to write glue code to unlock it.
16. As an integrator, I want to opt into custom rendering for a specific field type via a documented API, so that my non-standard components can participate in live preview.
17. As an integrator, I want to opt into custom rendering for a specific field path when it differs from my site-wide convention, so that one-off components can still benefit.
18. As an integrator, I want the preview API exposed on `window` to carry a version number, so that my code can degrade gracefully if Strapi versions drift.
19. As an integrator, I want clear documentation of how media markers need to be rendered on my media wrappers, so that I can wire this up correctly the first time.
20. As an integrator, I want a list of DOM tags the built-in media handler can target (img, video, source, picture), so that I know when I need to register a custom handler.
21. As an integrator, I want a list of block types the built-in blocks renderer supports, so that I know when I need a custom renderer.
22. As an integrator, I want sites that do not opt into the new API to keep working, falling back to the existing full-page refresh behavior, so that upgrading Strapi is safe even before I wire up the new surface.
23. As an integrator, I want the change on my side to be minimal for the common case (rendering one extra attribute on media wrappers), so that adoption is low-cost.

### Strapi engineer (shipping and maintaining the feature)

24. As a Strapi engineer, I want the preview script to dispatch on field type rather than requiring per-field wiring, so that new fields of a supported type just work.
25. As a Strapi engineer, I want server-side encoding of media and blocks to be additive (no response shape breakage), so that existing consumers do not break.
26. As a Strapi engineer, I want encoded payload size for blocks to stay within reasonable bounds on realistic content, so that the source-maps header does not tank API performance.
27. As a Strapi engineer, I want the internal preview-script helpers to be unit-testable, so that regressions in media/blocks patching surface in CI rather than in production.
28. As a Strapi engineer, I want the content-source-maps service to gain test coverage as part of this change, so that we stop shipping it untested.
29. As a Strapi engineer, I want each slice to be independently shippable and reversible, so that we can pause or cut scope without stranding work.
30. As a Strapi engineer, I want a clear fallback path (full-page refresh) when no handler is registered and no default applies, so that we never leave the preview in a broken state.

### QA (validating in LaunchPad)

31. As a QA engineer, I want to run LaunchPad against a local or experimental build of Strapi, so that I can validate changes before release.
32. As a QA engineer, I want a checklist of media and blocks scenarios to run through in LaunchPad, so that coverage is repeatable between builds.
33. As a QA engineer, I want to confirm that editing existing LaunchPad content types (pages, products, articles) continues to work with live preview, so that no regression ships.

## Implementation Decisions

### Scope of this PRD

- Covers **media fields** and **blocks fields** only. JSON, integer, float, boolean, and relations are out of scope.
- Delivery is **tracer-bullet**: Slice 1 ships in-place media patching end-to-end. Subsequent slices are listed in "Rollout" but will be tracked as separate issues.

### Architecture — two update primitives

- **In-place patch** for shape-stable edits. Handled entirely inside the preview script using a type-aware branch in the existing field-change handler.
- **Scoped refresh** for shape-changing edits. The preview script dispatches the new field value to a registered renderer for that field's subtree, replacing the subtree's DOM without touching the rest of the page. No full-page reload.
- **Full-page refresh** remains as a final fallback, triggered only when no handler is registered and no built-in default applies.

### Server-side encoding

- Extend the content source maps service to encode stega metadata into blocks leaf text nodes, using path notation that includes array indices (consistent with components and dynamic zones).
- Extend media handling to emit a string property (a "field-root marker") on media objects carrying the encoded metadata. This is additive — existing media response shape is preserved. Zero-width stega characters cannot live inside `src` URLs safely, so the marker is a separate string property.
- The encoded metadata carries an optional `root` flag distinguishing field-root markers from leaf-text encodings, so the preview script can treat them differently.
- Encoding continues to be gated by the existing `strapi-encode-source-maps` request header — no change to header plumbing or opt-in mechanics.

### Admin-side payload

- The admin's preview input manager sends the field `type` alongside `field` and `value` in the field-change payload, so the preview script can dispatch correctly.
- Component and dynamic-zone types continue to skip direct sending (their nested fields send separately) — existing behavior preserved.

### Preview script (injected into iframe)

- Introduce a path-indexed map of DOM elements keyed by field path, rebuilt on mutation, so that per-field lookups are O(1) and shared across handlers.
- Branch the field-change handler on type: text-like types keep the current textContent patch; media and blocks follow new code paths.
- **Media in-place handler (built-in default):** walks from the matched marker element to the nearest `<img>`, `<video>`, `<source>`, or `<picture>` and swaps relevant attributes (`src`, `srcset`, `alt`, `poster`). Falls back to scoped refresh if the mime prefix changes between old and new values.
- **Blocks in-place handler (built-in default):** compares old and new block trees. If structure matches (same length, same `type` at each index, same child shape), patches leaf text nodes via their encoded paths. Otherwise falls back to scoped refresh.
- **Scoped-refresh dispatcher:** resolves a handler in precedence order — per-field handler, then per-type handler, then built-in default for the type, then "unhandled" signal to the parent admin (which triggers the existing full-page refresh).
- **Built-in blocks renderer:** a minimal HTML generator covering the default Strapi block types (paragraph, heading, list, list item, link, code, image). Registered as the default type handler for `blocks` so vanilla sites get structural edits for free.

### Public API surface

- Expose `window.strapiPreview` inside the preview iframe with:
  - A numeric `version` field, starting at 1, committed to under semver.
  - `onType(type, handler)` for registering a handler applied to every field of that type.
  - `onField(path, handler)` for registering a handler for one specific field path (overrides type-level).
  - An `off` method for deregistration.
- The public API is additive and opt-in. Sites that do not call it continue to work with the defaults and, where defaults do not apply, the full-page-refresh fallback.

### Integrator contract

- Integrators rendering media must render the encoded marker as a `data-strapi-source` attribute on the media wrapper (so the preview script can locate it). This is a small, documented contract — one attribute per media wrapper.
- Integrators using the default Strapi blocks renderer inherit block structural-edit support automatically.
- Integrators using custom block rendering register `onType('blocks', handler)` to opt in.

### LaunchPad changes

LaunchPad is the QA target and a representative consumer. The following changes are required on the LaunchPad side:

- **Consume an experimental Strapi build.** LaunchPad is currently pinned to published `@strapi/*` packages. Wiring for consuming the experimental release (npm tag, yarn overrides, or local linking) needs to be decided — this PRD assumes an experimental npm release.
- **Update the `StrapiImage` wrapper** to render the media marker attribute (`data-strapi-source={image._strapiSource}`) on its outermost element, so the built-in media handler can target it.
- **Confirm `next/image` compatibility.** The built-in handler walks to the nearest `<img>`; `next/image` renders an `<img>` under its wrapper, so this should work, but requires QA confirmation.
- **Optionally activate the installed `@strapi/blocks-react-renderer`.** Since blocks editing will become a first-class preview target, LaunchPad should expose at least one content surface using a blocks field so this path can be exercised in QA.

### Rollout order (tracer-bullet slices)

1. **Slice 1 — Media in-place patching (tracer bullet for this PRD).**
   Server marker on media objects, admin `type` in payload, preview-script media branch, LaunchPad `StrapiImage` update. Validates the architecture end-to-end and delivers the most visible user win.
2. **Slice 2 — Blocks text-only in-place editing.** Server stega on block text leaves. Zero admin changes, zero preview-script changes. Users see block text edits live.
3. **Slice 3 — `window.strapiPreview` public API.** Versioned surface, `onType` / `onField` / `off`. No functional behavior change on its own; enables Slices 4–5.
4. **Slice 4 — Scoped refresh + media cross-kind swap.** Image → video and similar shape-changing edits.
5. **Slice 5 — Blocks structural edits + built-in blocks renderer.** Add/remove/reorder/type-change blocks, plus the default HTML renderer.
6. **Slice 6 — `strapiFieldReplaceUnhandled` fallback message.** Ensures graceful degrade to full-page refresh when nothing else applies.

Each slice is independently mergeable and reversible.

## Testing Decisions

### Principle

Tests target **external behavior**, not internal structure. For each module under test, we exercise the interface a caller would use and assert on observable outputs. Implementation details (private helper names, specific call counts on internal functions, ordering of internal branches) are not asserted.

### Modules to test

The following modules gain meaningful new behavior and will be tested:

- **Content source maps service (server).** Currently has no test coverage. Tests cover: strings continue to encode unchanged (regression); media objects gain the marker property with expected metadata; blocks trees encode every leaf text with correctly indexed paths; the `root` flag appears where expected and only there.
- **Field utilities (admin).** Existing test file covers path parsing and metadata parsing. Extended with cases for the new `root` parameter and for blocks-path resolution.
- **Preview script internals (admin).** Currently has no test coverage. The script's IIFE wrapper will be refactored so internal helpers (path indexing, media attribute patching, block tree diffing, handler dispatch) are exported pure functions composed by the IIFE. Tests exercise these helpers in jsdom: given a DOM and a field-change payload, the right attributes/text nodes change; given a shape-changing payload, the scoped-refresh dispatcher selects the right handler.
- **Preview input manager hook (admin).** Currently has no test coverage. Tests cover: field changes send a payload including `type`; component and dynamic-zone types continue to skip direct sending.

### Prior art

- **Server unit tests:** `packages/core/core/src/core-api/controller/__tests__/transform.test.ts` tests the transform pipeline and is the closest prior art for content-source-maps tests.
- **Admin unit tests:** `packages/core/content-manager/admin/src/preview/utils/tests/fieldUtils.test.ts` is the closest prior art for new preview-side unit tests.
- **API/e2e tests:** `tests/api/core/content-manager/preview/preview.test.api.ts` tests preview URL generation end-to-end. If it proves useful, a similar integration test could cover the source-maps header flow, but QA in LaunchPad is the primary end-to-end validation for this PRD.

### QA in LaunchPad

Beyond unit tests, every slice is validated against LaunchPad using a scenario checklist matching the user stories above. Regression scenarios cover text, richtext, component, and dynamic-zone preview behavior — none of which should change.

## Out of Scope

- Live preview support for JSON, integer, float, boolean, and UID fields. These were flagged in prior discussion but are deferred.
- Relations. Explicitly excluded by the current preview codebase (`RELATIONS_NOT_HANDLED`) and not addressed here.
- Changes to the preview URL generation, iframe sandboxing, or preview-enable configuration.
- Server-side rendering of partial HTML fragments for the preview iframe. Scoped refresh is done by dispatching to a client-side renderer, not by asking the integrator's server for a fragment.
- Automatic migration of existing integrator sites. Opting into the new API is manual and documented.
- Support for CSS `background-image` as a media target. Scope is limited to `<img>`, `<video>`, `<source>`, `<picture>` tags.
- Rich block types beyond Strapi's default set in the built-in blocks renderer. Custom block types require an integrator-registered handler.

## Further Notes

- **Response size.** Encoding stega into every block text leaf multiplies metadata across many DOM nodes. Before merging Slice 2, realistic payload measurements should inform whether a size-budget guard or opt-out-per-field mechanism is warranted.
- **Public API commitment.** `window.strapiPreview` becomes a supported contract. The `version` field is there so future breaking changes can be negotiated; do not ship without it.
- **Script testability refactor.** The current preview-script IIFE wrapping makes unit tests awkward. Refactoring internals into exported pure helpers composed by a thin IIFE is a prerequisite for testable delivery, not optional polish.
- **Documentation.** No public-facing docs exist for the preview event protocol or stega encoding today. A README in the preview folder of the content-manager package will be added, covering the event protocol, stega format, `window.strapiPreview` surface, built-in defaults, and versioning policy.
- **Prior constraints carried forward.** The injected preview script still cannot use module imports (it is stringified and shipped as an IIFE). All new helpers must respect this constraint — they live as exported functions in a module, but the IIFE composes them via inlining at script-build time.
