# ADR-0006: Plugins imported-and-added; no `package.json` scan

**Status:** Accepted

## Context

Legacy plugin loading mixes three discovery sources: internal `INTERNAL_PLUGINS`
resolved from `@strapi/strapi`, installed plugins found by scanning `package.json`
dependencies, and declared plugins from `config/plugins.js`. Implicit scanning conflicts
with the "nothing implicit" philosophy of programmatic mode.

## Decision

In programmatic mode there is **no `package.json` scan and no `INTERNAL_PLUGINS`
auto-load**. Plugins are treated like any other library: the user **imports the plugin
value and adds it** to a `plugins` map.

- Entry shape: `PluginModule | { plugin: PluginModule; enabled?: boolean; config?: object }`.
  `PluginModule` is the existing `strapi-server` contract (object or factory) — **no
  plugin-package changes required**. A shared `normalizePluginModule` (call if function,
  else use as object; merge with defaults) serves both legacy and programmatic paths.
- **Map key = canonical plugin name** (e.g. `'users-permissions'`), matching the
  plugin's internal `plugin::<name>.*` UIDs. The name lives in the package's
  `package.json` `strapi.name`, not the `strapi-server` export, so keying by name keeps
  UIDs correct with zero package changes.
- **Prefer value imports** over side-effect imports (no order-dependent global mutation).
- **`recommendedPlugins()`** (`@strapi/strapi/plugins`) returns the familiar set, but is
  _just imports_ under the hood — explicit and tree-shakeable.
- **`plugins: fromDisk()`** is the sole bridge back to legacy discovery (scan deps, load
  `config/plugins.js`, apply `src/extensions`).

## Consequences

- Fully explicit, type-checked, refactor-safe plugin wiring; nothing loads unless declared.
- Works with existing community plugins exposing `strapi-server`.
- Map-key typos can misalign internal UIDs — acceptable since names are well-known;
  optional validation against the package's `strapi.name` can warn.
- Phase 2/3: a `definePlugin({ name, ... })` export would let plugins self-declare their
  name and enable an array form `plugins: [usersPermissions()]`.

## Alternatives considered

- **Keep scanning in programmatic mode.** Rejected: implicit, fights the design.
- **Bare side-effect imports that self-register.** Rejected: invisible, order-dependent.
