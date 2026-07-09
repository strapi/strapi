# Strapi 5.50 — Vite 8 upgrade notes

These notes apply when upgrading to Strapi **5.50.0** (Vite 8 on the admin bundler path).

## CommonJS default-import interop

Vite 8 changes what `import pkg from 'cjs-package'` binds to (whole `module.exports` vs `.default`), and unifies dev vs production behavior.

**Strapi default:** the admin bundler sets `legacy.inconsistentCjsInterop: true` so existing custom `src/admin` code and plugin admin chunks keep pre-Vite-8 behavior.

**To opt into Vite 8 interop** in a custom `src/admin/vite.config.*`:

```ts
export default (config) => ({
  ...config,
  legacy: {
    ...config.legacy,
    inconsistentCjsInterop: false,
  },
});
```

Then audit default imports from CommonJS dependencies in admin source.

## Node.js version

Strapi **5.50.0+** requires **Node.js >= 22.12.0** (LTS: 22.x, 24.x, or 26.x). This matches Vite 8's engine requirement and Strapi's supported Node policy.

## Custom `src/admin/vite.config.*`

The `@strapi/upgrade` codemods for 5.50.0 migrate common deprecated options. Some Rolldown options that Rollup supported are **removed** (not aliased). If your config used any of the following, update manually after the codemod runs:

- `output.format: 'system'` or `'amd'`
- Rollup plugin hooks: `shouldTransformCachedModule`, `resolveFileUrl`, `renderDynamicImport`
- `rollupOptions.watch.chokidar` (Rolldown watch options differ)

The rename codemod prepends review comments when it detects these patterns.

## Browser bundling shims

Strapi ships targeted admin-bundle shims for `object-inspect` and postcss `browser: false` Node imports. Other dependencies that relied on the same `browser` field mapping may need similar treatment in custom plugins.
