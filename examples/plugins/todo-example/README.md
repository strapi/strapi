# strapi-plugin-todo-example

Optional contributor sandbox plugin for the Strapi monorepo.

## Try it in getstarted

1. From this folder, run `yarn build` (uses `npx @strapi/sdk-plugin@6.0.1` — not a workspace dependency).
2. In `examples/getstarted/config/plugins.js`, set `todo.enabled` to `true`.
3. From `examples/getstarted`, run `yarn develop`.

`dist/` is gitignored; the build step is required before enabling the plugin.

## Publishing a plugin outside this repo

For plugins installed from npm, add `@strapi/sdk-plugin` as a devDependency and point `exports` at built files under `dist/`. See [sdk-plugin](https://github.com/strapi/sdk-plugin) and in-repo packages such as `packages/plugins/color-picker`.
