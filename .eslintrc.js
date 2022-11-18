const frontPaths = [
  'packages/**/admin/src/**/*.js',
  'packages/generators/app/lib/resources/files/admin/app.js',
  'packages/**/ee/admin/**/*.js',
  'packages/core/helper-plugin/**/*.js',
  'packages/**/tests/front/**/*.js',
  'test/config/front/**/*.js',
];

module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
  },
  overrides: [
    {
      // Backend javascript
      files: ['packages/**/*.js', 'test/**/*.js', 'scripts/**/*.js'],
      excludedFiles: frontPaths,
      ...require('./.eslintrc.back.js'),
    },

    // Backend typescript
    {
      files: ['packages/**/*.ts', 'test/**/*.ts', 'scripts/**/*.ts'],
      excludedFiles: frontPaths,
      ...require('./.eslintrc.back.typescript.js'),
    },

    // Frontend
    {
      files: frontPaths,
      ...require('./.eslintrc.front.js'),
    },
  ],
};
