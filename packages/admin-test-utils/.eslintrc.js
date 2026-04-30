module.exports = {
  root: true,
  extends: ['custom/back/typescript'],
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
};
