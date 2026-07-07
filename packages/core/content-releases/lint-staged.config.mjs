// @ts-check

/**
 * lint-staged runs with this package as cwd; use Yarn's top-level binary lookup so
 * workspace imports resolve the same way as `nx lint @strapi/content-releases`.
 *
 * @type {import('lint-staged').Configuration}
 */
const config = {
  '*.{js,ts,jsx,tsx}': (filenames) => {
    const eslintFiles = filenames.filter((file) => !file.includes('/shared/'));
    const tasks = [`prettier --cache --write ${filenames.join(' ')}`];

    if (eslintFiles.length > 0) {
      tasks.unshift(`yarn run -T eslint --cache --fix --max-warnings=0 ${eslintFiles.join(' ')}`);
    }

    return tasks;
  },
  '!(*.js|*.ts|*.jsx|*.tsx)': ['prettier --cache --write --ignore-unknown'],
};

export default config;
