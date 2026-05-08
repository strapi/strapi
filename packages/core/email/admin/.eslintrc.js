module.exports = {
  root: true,
  extends: ['custom/front/typescript'],
  overrides: [
    {
      files: ['**/*'],
      rules: {
        'import/no-unresolved': 'off',
      },
    },
  ],
};
