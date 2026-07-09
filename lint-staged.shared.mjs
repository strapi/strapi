// @ts-check

/**
 * Shared lint-staged task map, re-exported by each workspace's
 * `lint-staged.config.mjs`.
 *
 * lint-staged runs these with the cwd set to the package containing the matched
 * config file, so eslint resolves that package's own tsconfig / .eslintrc.cjs.
 */

const isGeneratedTranslationTypes = (file) => file.endsWith('keys.generated.d.ts');

/**
 * @param {string[]} files
 */
const eslintFiles = (files) => files.filter((file) => !isGeneratedTranslationTypes(file));

/**
 * @type {import('lint-staged').Configuration}
 */
const config = {
  '*.{js,ts,jsx,tsx}': (files) => {
    const commands = [];
    const forEslint = eslintFiles(files);

    if (forEslint.length > 0) {
      commands.push(`eslint --cache --fix --max-warnings=0 ${forEslint.join(' ')}`);
    }

    if (files.length > 0) {
      commands.push(`prettier --cache --write ${files.join(' ')}`);
    }

    return commands;
  },
  '!(*.js|*.ts|*.jsx|*.tsx)': ['prettier --cache --write --ignore-unknown'],
};

export default config;
