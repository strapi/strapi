# strapi-plugin-todo-example

Optional **contributor sandbox** plugin for the Strapi monorepo. It demonstrates plugin behaviour (content-types, admin UI, content-manager injection) when loaded from source—not the workflow for publishing a plugin to npm.

## Try it in getstarted

1. In `examples/getstarted/config/plugins.js`, set `todo.enabled` to `true`.
2. From `examples/getstarted`, run `yarn develop` (or `yarn develop --watch-admin` for admin HMR).

No build step is required in this folder. Strapi loads server code from `server/src` and bundles admin code from `admin/src` as part of the app’s admin build (same idea as `examples/plugins/workspace-plugin`).

## Developing here

Edit files under `admin/src` and `server/src`, then restart the app or rely on admin watch for front-end changes.

This package intentionally points `package.json` `exports` at source files. That keeps monorepo iteration simple; it is **not** the layout to copy when shipping a plugin.

## Publishing a plugin outside this repo

For plugins you install from npm, build admin and server entrypoints into `dist/` (for example with [`@strapi/sdk-plugin`](https://github.com/strapi/sdk-plugin)) and point `import` / `require` / `default` in `exports` at those built files. See official Strapi plugin documentation and in-repo packages such as `packages/plugins/color-picker` for the `source` + `dist` export pattern.
