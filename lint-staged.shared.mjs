// @ts-check

import { ESLint } from 'eslint';

/**
 * Shared lint-staged task map, re-exported by each workspace's
 * `lint-staged.config.mjs`.
 *
 * lint-staged runs these with the cwd set to the package containing the matched
 * config file, so eslint resolves that package's own tsconfig / .eslintrc.cjs.
 *
 * Some files are intentionally excluded via a package's ESLint `ignorePatterns`
 * (e.g. `shared/**` in `@strapi/admin`, `jest.config.js` in several packages,
 * `bin/**` in `@strapi/upgrade`). Passing an ignored file to the ESLint CLI
 * still emits a "file ignored because of a matching ignore pattern" warning,
 * which `--max-warnings=0` turns into a hard failure and blocks the commit —
 * see https://github.com/strapi/strapi/issues/26952. `ESLint#isPathIgnored`
 * mirrors the CLI's own ignore resolution, so ESLint only runs on files it
 * actually lints; Prettier still formats everything.
 *
 * Generated translation key types (`keys.generated.d.ts`) are also excluded from
 * ESLint — they are machine-written and not part of package lint config.
 *
 * @type {import('lint-staged').Configuration}
 */
const config = {
  async '*.{js,ts,jsx,tsx}'(files) {
    const eslint = new ESLint();
    const ignored = await Promise.all(files.map((file) => eslint.isPathIgnored(file)));
    const lintable = files.filter(
      (file, index) => !ignored[index] && !file.endsWith('keys.generated.d.ts')
    );

    const quote = (list) => list.map((file) => `"${file}"`).join(' ');

    const commands = [];
    if (lintable.length > 0) {
      commands.push(`eslint --cache --fix --max-warnings=0 ${quote(lintable)}`);
    }
    commands.push(`prettier --cache --write ${quote(files)}`);

    return commands;
  },
  '!(*.js|*.ts|*.jsx|*.tsx)': ['prettier --cache --write --ignore-unknown'],
};

export default config;
