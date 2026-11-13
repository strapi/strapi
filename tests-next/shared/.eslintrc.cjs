// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['eslint-config-custom/back/typescript'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['node_modules/', '.eslintrc.cjs', 'lint-staged.config.mjs'],
  overrides: [
    {
      // CommonJS run by plain Node or loaded by Strapi as is: the test plugin and
      // src/app/generate-app.cjs.
      files: ['*.cjs', 'test-plugin/**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        strict: 'off',
        // The shared lint config targets old Node versions; the repo requires Node >= 22.
        'node/no-unsupported-features/es-builtins': 'off',
        'node/no-unsupported-features/node-builtins': 'off',
      },
    },
  ],
};

module.exports = config;
