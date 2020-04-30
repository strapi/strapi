module.exports = {
  presets: [require.resolve('@babel/preset-env'), require.resolve('@babel/preset-react')],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-transform-modules-commonjs',
  ].map(require.resolve),
};
