# Plan: Live Preview support for Media and Blocks fields

> Source PRD: [plans/live-preview-media-blocks-prd.md](live-preview-media-blocks-prd.md)

## Architectural decisions

Durable decisions that apply across all phases.

- **Encoding trigger.** The existing `strapi-encode-source-maps` request header continues to gate stega encoding end-to-end. No change to how the header is read or propagated.
- **Encoding format.** Stega metadata is a URLSearchParams string carrying `path`, `type`, `documentId`, and optional `model`, `kind`, `locale`. A new optional `root` flag distinguishes field-root markers (media objects, blocks wrappers) from leaf-text encodings.
- **Media marker shape.** Metadata for a media field is emitted as a **string property on the media object**, not embedded into the `src` URL. Zero-width characters inside a `src` break the URL; a separate marker property is additive and safe.
- **Media marker consumption.** Integrators render the marker as a `data-strapi-source` attribute on the outermost element of their media wrapper. This is a small, documented contract.
- **Blocks path format.** Stega paths into blocks include array indices, consistent with components and dynamic zones (e.g. `content.0.children.1.text`).
- **Transport.** Admin↔iframe communication stays on `postMessage`. No WebSockets, no polling.
- **Admin payload.** Field-change messages carry `{ field, value, type }`. The `type` discriminator is what the preview script dispatches on.
- **Public API namespace.** `window.strapiPreview`, exposed inside the preview iframe. Ships with a numeric `version` field committed to under semver. Surface: `onType(type, handler)`, `onField(path, handler)`, `off(key)`.
- **Handler resolution order.** For any field-change event the preview script resolves a handler in precedence: per-field handler → per-type handler → built-in default for the type → signal the parent admin to trigger the existing full-page refresh.
- **Supported media target tags.** The built-in media handler walks to the nearest `<img>`, `<video>`, `<source>`, or `<picture>`. CSS `background-image` is explicitly out of scope.
- **Script execution constraint.** The injected preview script is still delivered as a stringified IIFE and cannot use module imports at runtime. New helpers live as exported functions in a module but are inlined by the IIFE composer.
- **Testability refactor.** The preview-script internals are refactored in Phase 1 into exported pure functions composed by the IIFE, so helpers can be unit-tested in jsdom. This refactor is a prerequisite, not optional polish.
- **QA target.** LaunchPad is the primary end-to-end validation environment. Each phase includes LaunchPad-side acceptance where applicable.
- **Fallback.** Whenever no handler is registered and no default applies, the preview falls back to the existing full-page refresh via `strapiUpdate`. No phase ever leaves the preview in a broken state.

---

## Phase 1: Media in-place patching (tracer bullet)

**User stories**: 2, 12, 13, 14, 15, 19, 20, 22, 23, 24, 25, 27, 28, 29, 30, 31, 32, 33

### What to build

The first end-to-end vertical slice. An editor who changes the alt text of an image, or swaps one image for another image (same kind), sees the preview update in place without a full page reload.

- **Server.** When encoding is requested, media objects emitted in the response gain a string marker property carrying the stega-encoded metadata for that media field. Existing string fields continue to encode unchanged. No change to response shape beyond additive properties.
- **Admin.** The preview input manager's field-change payload gains a `type` discriminator alongside the existing `field` and `value`.
- **Preview script.** Internals are refactored into exported pure helpers composed by the IIFE, making them unit-testable. A path-indexed element map is introduced, rebuilt on DOM mutation. The field-change handler branches on `type`. Text-like types continue to patch `textContent` exactly as today. A new media branch walks from the marked wrapper element to the nearest supported media tag (`<img>`, `<video>`, `<source>`, `<picture>`) and swaps relevant attributes (`src`, `srcset`, `alt`, `poster`) when the mime prefix is unchanged. If the mime prefix has changed, or there is no matching element, the change defers to a later phase — for now it falls through to the existing full-page refresh path.
- **LaunchPad.** The `StrapiImage` wrapper renders `data-strapi-source` from the marker property on the media object. Consumption switches from published `@strapi/*` to an experimental build produced from this repository.
- **Tests.** New unit coverage for the content source maps service (including regression coverage for existing string encoding). New unit coverage for the preview-script helpers (path indexing, media attribute patching). Extension to existing field utilities tests to cover the new `root` flag.

### Acceptance criteria

- [ ] Server response for a content type containing a media field includes the marker property with correctly formatted metadata when the source-maps header is set.
- [ ] Server response is byte-for-byte identical to today when the source-maps header is absent.
- [ ] Server tests cover: strings unchanged, media gains marker, `root` flag present on media and absent on strings.
- [ ] Admin sends `type` in the field-change payload; existing component and dynamic-zone skip logic is preserved.
- [ ] Preview script recognizes the media marker attribute on wrappers and registers them in the path index.
- [ ] Editing alt text on an image in the admin updates the rendered image's `alt` attribute in the preview iframe without a reload.
- [ ] Swapping one image for another same-kind image in the admin updates `src` (and `srcset` when present) in the preview iframe without a reload.
- [ ] Existing live preview for text, richtext, component, and dynamic-zone fields continues to work unchanged — verified against existing fixtures and LaunchPad.
- [ ] Cross-kind media swaps (image → video) still trigger the existing full-page refresh; no regression from current behavior, no broken state.
- [ ] Empty → populated and populated → empty media transitions still trigger the full-page refresh; no broken state.
- [ ] LaunchPad runs against the experimental Strapi build and the above behaviors verify end-to-end, including scroll position preservation during in-place media updates.
- [ ] Focus and blur highlighting continue to work for media fields.
- [ ] Preview script internals are refactored so helpers are exported pure functions and have jsdom-based unit tests.

---

## Phase 2: Public API, scoped refresh, and cross-kind media

**User stories**: 3, 4, 5, 16, 17, 18, 30

### What to build

Complete the media story. Introduce the public `window.strapiPreview` API and the scoped-refresh primitive. Use both to cover the media cases Phase 1 deferred: swapping an image for a video, emptying a populated field, and populating an empty field — all without a full page reload.

- **Public API.** `window.strapiPreview` is exposed inside the preview iframe with `version` (numeric, starts at 1), `onType(type, handler)`, `onField(path, handler)`, and `off(key)`. Handlers registered here participate in the resolution order defined in the architectural decisions.
- **Scoped-refresh primitive.** When a field change cannot be patched in place, the preview script invokes the resolved handler (per-field → per-type → built-in default). The handler receives the new field value and the matched wrapper element, and is responsible for replacing the wrapper's subtree. If no handler is found, the preview script sends a new internal "unhandled" message to the admin, which triggers the existing full-page refresh. This keeps the fallback safe and behavior-preserving.
- **Built-in media default.** A default type handler for `media` is registered on `window.strapiPreview` at script start. It handles cross-kind swaps, empty↔populated transitions, and any case the Phase 1 in-place path defers. Integrators can override via `onType('media', ...)` or `onField(path, ...)`.
- **Admin listener.** The admin listens for the new "unhandled" message and dispatches the existing `strapiUpdate` full-page refresh in response.
- **LaunchPad.** No new code changes required — the existing `StrapiImage` marker rendering from Phase 1 is sufficient. LaunchPad exercises the new cases as part of QA.
- **Tests.** Preview-script unit coverage is extended for the handler-resolution dispatcher and the built-in media default. No new server-side tests required.

### Acceptance criteria

- [ ] `window.strapiPreview` is present inside the preview iframe once the injected script runs, with a `version` of 1 and the documented method surface.
- [ ] `onType('media', handler)` replaces the built-in default for media field changes; `off` deregisters it and restores the default.
- [ ] `onField(path, handler)` takes precedence over `onType` for that specific path.
- [ ] Swapping an image for a video in a media field that allows both updates the preview to the correct element type without a full reload.
- [ ] Clearing a populated media field updates the preview to the empty state without a full reload.
- [ ] Populating a previously empty media field updates the preview to show the new media without a full reload.
- [ ] When no handler is registered for a field type and no built-in default covers the change, the admin receives the "unhandled" message and triggers a full-page refresh — never leaves the preview in a broken state.
- [ ] All Phase 1 acceptance criteria still pass.
- [ ] LaunchPad QA covers each of the above transitions with scroll preservation.

---

## Phase 3: Blocks support (text edits, structural edits, built-in renderer)

**User stories**: 6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 21, 22, 25, 26, 28, 29, 33

### What to build

Bring blocks fields to parity with media. Editors editing block text see the change in place. Editors adding, removing, reordering, or retyping blocks see the change via scoped refresh driven by a built-in blocks renderer.

- **Server.** The content source maps service gains blocks encoding. The blocks tree is traversed and every leaf `text` node is wrapped with stega metadata whose path includes array indices (e.g. `content.0.children.1.text`). A field-root marker is also emitted for the blocks field so the wrapper can be targeted for scoped refresh.
- **Preview script.** The existing text-patching path covers in-place block text edits for free — block leaf text ends up in DOM text nodes, the MutationObserver picks up the stega, and the path index resolves it like any other text field.
- **Blocks in-place handler.** A new default handler compares the old and new block trees. If structure matches (same length, same `type` per index, same child shape), it patches leaf text nodes via their encoded paths. If structure differs, it defers to scoped refresh.
- **Built-in blocks renderer.** A minimal HTML generator covering the default Strapi block types (paragraph, heading levels 1–6, list, list item, link, code, image). Registered as the default `onType('blocks', ...)` handler. Custom block types override by re-registering.
- **LaunchPad.** Exposes at least one content surface using a blocks field so this path is exercisable in QA. If one already exists, just wire it into a preview-enabled content type. `@strapi/blocks-react-renderer` is already installed — activating it for live preview requires no new dependency.
- **Tests.** Server test coverage extended for blocks encoding including nested and indexed paths. Preview-script unit coverage extended for the blocks diff-and-patch helper and the built-in renderer. Field-utility tests extended for blocks path resolution.

### Acceptance criteria

- [ ] Server response for a content type with a blocks field encodes stega metadata into every leaf text node with correct indexed paths when the source-maps header is set.
- [ ] Server response includes the blocks field-root marker so the wrapper can be located for scoped refresh.
- [ ] Editing text inside an existing block in the admin updates the preview in place without a full reload.
- [ ] Adding a new block updates the preview via scoped refresh, not full-page reload.
- [ ] Removing a block updates the preview via scoped refresh.
- [ ] Reordering blocks updates the preview via scoped refresh.
- [ ] Changing a block's type (paragraph to heading, for instance) updates the preview via scoped refresh.
- [ ] The built-in blocks renderer correctly renders paragraph, heading, list, list item, link, code, and image block types.
- [ ] Custom block renderers registered via `onType('blocks', ...)` override the built-in default.
- [ ] When a custom block type is encountered without a registered handler, the preview script falls back to the full-page refresh path — no broken state.
- [ ] Encoded response size on realistic blocks content has been measured; if it exceeds an agreed budget, a documented mitigation is in place before shipping.
- [ ] All Phase 1 and Phase 2 acceptance criteria still pass.
- [ ] LaunchPad QA covers block text edits plus add, remove, reorder, and type-change scenarios with scroll preservation.
