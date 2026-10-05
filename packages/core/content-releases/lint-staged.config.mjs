// @ts-check

/**
 * lint-staged runs with this package as cwd; use Yarn's top-level binary lookup so
 * workspace imports resolve the same way as `nx lint @strapi/content-releases`.
 *
 * @type {import('lint-staged').Configuration}
 */
const config = {
  '*.{js,ts,jsx,tsx}': [
    'yarn run -T eslint --cache --fix --max-warnings=0',
    'prettier --cache --write',
  ],
  '!(*.js|*.ts|*.jsx|*.tsx)': ['prettier --cache --write --ignore-unknown'],
};

export default config;
