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
  plugins: [],
};
