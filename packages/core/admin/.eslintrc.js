module.exports = {
  root: true,
  overrides: [
    {
      files: ['ee/admin/**/*'],
      extends: ['custom/front'],
      rules: {
        'import/extensions': 'off',
      },
    },
    {
      files: ['**/*'],
      excludedFiles: ['admin/**/*', 'ee/admin/**/*'],
      extends: ['custom/back'],
    },
  ],
};
