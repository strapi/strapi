module.exports = {
  overrides: [
    {
      files: ['consumer.test.cjs'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      },
    },
    {
      files: ['fixtures/*.ts'],
      extends: ['eslint-config-custom/back/typescript'],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: './tsconfig.eslint.json',
        sourceType: 'module',
      },
      rules: {
        // Consumer fixtures intentionally import packages provided by the workspace installation.
        'node/no-extraneous-import': 'off',
      },
    },
  ],
};
