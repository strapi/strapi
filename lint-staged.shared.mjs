// @ts-check

import { ESLint } from 'eslint';

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
  '*.{js,ts,jsx,tsx}': async (files) => {
    const eslint = new ESLint({ cwd: process.cwd() });
    const lintable = [];

    for (const file of files) {
      if (!(await eslint.isPathIgnored(file))) {
        lintable.push(file);
      }
    }

    const tasks = [`prettier --cache --write ${files.join(' ')}`];

    if (lintable.length > 0) {
      tasks.unshift(`eslint --cache --fix --max-warnings=0 ${lintable.join(' ')}`);
    }

    return tasks;
  },
  '!(*.js|*.ts|*.jsx|*.tsx)': ['prettier --cache --write --ignore-unknown'],
};

export default config;
