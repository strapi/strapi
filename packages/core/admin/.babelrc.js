module.exports = {
  presets: [
    '@babel/preset-react',
    [
      '@babel/preset-env',
      {
        loose: true,
      },
    ],
  ],
  plugins: [
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-function-bind',
    [
      '@babel/plugin-transform-runtime',
      {
        helpers: true,
        regenerator: true,
      },
    ],
    [
      'babel-plugin-styled-components',
      {
        pure: true,
      },
    ],
  ],
};
