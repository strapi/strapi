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
      files: [
        'packages/**/*.js',
        'test/**/*.js',
        'scripts/**/*.js',
        'packages/**/*.ts',
        'test/**/*.ts',
        'scripts/**/*.ts',
      ],
      excludedFiles: frontPaths,
      ...backendRules,
    },
    {
      files: frontPaths,
      ...require('./.eslintrc.front.js'),
    },
  ],
};
