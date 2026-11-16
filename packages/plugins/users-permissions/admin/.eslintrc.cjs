// @ts-check

/** @import { Linter } from 'eslint' */

/** @type {Linter.Config} */
module.exports = {
  root: true,
  extends: ['eslint-config-custom/front/typescript'],
  ignorePatterns: ['.eslintrc.cjs'],
  parserOptions: { tsconfigRootDir: __dirname, project: ['./tsconfig.json'] },
  overrides: [
    {
      files: ['src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-globals': [
          'error',
          {
            name: 'strapi',
            message: 'Use plugin API responses or explicit inputs instead of browser globals.',
          },
        ],
        'no-restricted-properties': [
          'error',
          {
            object: 'window',
            property: 'strapi',
            message: 'Use plugin API responses or explicit inputs instead of browser globals.',
          },
          {
            object: 'globalThis',
            property: 'strapi',
            message: 'Use plugin API responses or explicit inputs instead of browser globals.',
          },
          {
            object: 'global',
            property: 'strapi',
            message: 'Use plugin API responses or explicit inputs instead of browser globals.',
          },
        ],
      },
    },
  ],
};
