// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  ignorePatterns: [
    'dist',
    '.eslintrc.cjs',
    'rollup.config.mjs',
    'coverage/',
    'lint-staged.config.mjs',
  ],
  overrides: [
    {
      files: ['admin/**/*'],
      extends: ['eslint-config-custom/front'],
      rules: {
        'import/extensions': 'off',
      },
    },
    {
      // Shared contracts are TypeScript modules (namespaces, `import type`).
      // Lint them with the TS parser instead of ignoring the folder or falling
      // through to the script parser. Contract-style rules stay relaxed.
      files: ['shared/**/*.{ts,tsx}'],
      extends: ['eslint-config-custom/back/typescript'],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./admin/tsconfig.json'],
      },
      rules: {
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/ban-types': 'off',
        'import/first': 'off',
      },
    },
    {
      files: ['**'],
      excludedFiles: ['admin/**/*', 'server/**/*', 'shared/**/*'],
      extends: ['eslint-config-custom/back'],
    },
  ],
};

module.exports = config;
