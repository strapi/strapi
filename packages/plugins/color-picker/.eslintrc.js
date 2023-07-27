module.exports = {
  root: true,
  overrides: [
    {
      files: ['admin/**/*'],
      extends: ['custom/front'],
    },
    {
      files: ['**/*'],
      excludedFiles: ['admin/**/*'],
      extends: ['custom/back'],
    },
  ],
};
