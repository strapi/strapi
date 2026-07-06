// @ts-check

/**
 * Shared lint-staged task map, re-exported by each workspace's
 * `lint-staged.config.mjs`.
 *
 * lint-staged runs these with the cwd set to the package containing the matched
 * config file, so eslint resolves that package's own tsconfig / .eslintrc.cjs.
 *
 * @type {import('lint-staged').Configuration}
 */
const config = {
  '*.{js,ts,jsx,tsx}': ['eslint --cache --fix', 'prettier --cache --write'],
  '!(*.js|*.ts|*.jsx|*.tsx)': ['prettier --cache --write --ignore-unknown'],
};

export default config;
