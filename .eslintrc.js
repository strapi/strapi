const frontPaths = [
  'packages/**/admin/src/**/*.js',
  'packages/generators/app/lib/resources/files/admin/app.js',
  'packages/**/ee/admin/**/*.js',
  'packages/core/helper-plugin/**/*.js',
  'packages/**/tests/front/**/*.js',
  'test/config/front/**/*.js',
];

const backendRules = require('./.eslintrc.back.js');

module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
  },
  overrides: [
    {
      // Backend javascript
      files: ['packages/**/*.js', 'test/**/*.js', 'scripts/**/*.js'],
      excludedFiles: frontPaths,
      ...backendRules,
    },

    // Backend typescript
    {
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
      files: ['packages/**/*.ts', 'test/**/*.ts', 'scripts/**/*.ts'],
      excludedFiles: frontPaths,
      //...backendRules, // TODO: write a typescript-friendly version of this
    },

    // Frontend
    {
      files: frontPaths,
      ...require('./.eslintrc.front.js'),
    },
  ],
};
