module.exports = {
  presets: [
    '@babel/preset-react',
    [
      '@babel/preset-env',
      {
        modules: 'commonjs',
        loose: true,
      },
    ],
  ],
  plugins: ['@babel/plugin-proposal-export-default-from', '@babel/plugin-proposal-function-bind'],
};
