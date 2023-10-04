module.exports = {
  root: true,
  overrides: [
    {
      files: ['**/*.js', '**/*.jsx'],
      extends: ['custom/front'],
      rules: {
        'import/extensions': 'off',
      },
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: ['custom/front/typescript'],
    },
  ],
};
