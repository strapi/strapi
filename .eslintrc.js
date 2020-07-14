const frontPaths = [
  'packages/**/admin/src/**/**/*.js',
  'packages/strapi-helper-plugin/**/*.js',
  'packages/**/test/front/**/*.js',
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
