module.exports = {
  root: true,
  overrides: [
    {
      files: ['admin/**/*', 'ee/admin/**/*'],
      extends: ['custom/front'],
    },
    {
      files: ['**/*'],
      excludedFiles: ['admin/**/*', 'ee/admin/**/*'],
      extends: ['custom/back'],
    },
  ],
};
