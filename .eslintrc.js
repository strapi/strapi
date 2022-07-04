const frontPaths = [
  'packages/**/admin/src/**/*.js',
  'packages/generators/app/lib/resources/files/admin/app.js',
  'packages/**/ee/admin/**/*.js',
  'packages/core/helper-plugin/**/*.js',
  'packages/**/tests/front/**/*.js',
  'packages/core/telemetry/admin/index.js',
  'packages/core/telemetry/admin/src/ampli/index.js',
  'test/config/front/**/*.js',
];

module.exports = {
  parserOptions: {
    ecmaVersion: 2018,
  },
  overrides: [
    {
      files: ['packages/**/*.js', 'test/**/*.js', 'scripts/**/*.js'],
      excludedFiles: frontPaths,
      ...require('./.eslintrc.back.js'),
    },
    {
      files: frontPaths,
      ...require('./.eslintrc.front.js'),
    },
  ],
};
