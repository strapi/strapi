const defaultPresets = [
  [
    '@babel/preset-env',
    {
      modules: 'commonjs',
      loose: true,
    },
  ],
];

module.exports = {
  presets: defaultPresets.concat(['@babel/preset-react', '@babel/preset-flow']),
  plugins: [
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
    ['@babel/plugin-proposal-private-methods', { loose: true }],
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-export-namespace-from',
    '@babel/plugin-proposal-function-bind',
  ],
};
