module.exports = {
  root: true,
  extends: ['custom/front/typescript', 'plugin:storybook/recommended'],
  parserOptions: {
    project: ['./tsconfig.eslint.json'],
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.eslint.json',
      },
    },
  },
  overrides: [
    {
      files: ['./jest.config.front.js', './webpack.config.js'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: ['./tests/*'],
      env: {
        jest: true,
      },
    },
  ],
};
