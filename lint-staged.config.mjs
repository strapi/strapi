// @ts-check

/**
 * Root lint-staged config: prettier-only catch-all.
 *
 * lint-staged matches each staged file to the *closest* config and does not
 * merge configs. Files inside a workspace that has its own
 * `lint-staged.config.mjs` are handled there (eslint + prettier). This root
 * config covers everything else — docs/, scripts/, root files, and the
 * workspaces without an `.eslintrc.cjs` — formatting only.
 *
 * @type {import('lint-staged').Configuration}
 */
const config = {
  '*': ['prettier --cache --write --ignore-unknown'],
};

export default config;
