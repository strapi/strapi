const defaultPresets = [
  [
    '@babel/preset-env',
    {
      modules: 'commonjs',
    },
  ],
];

module.exports = {
  presets: defaultPresets.concat(['@babel/preset-react', '@babel/preset-flow']),
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-export-default-from',
    '@babel/plugin-proposal-export-namespace-from',
    '@babel/plugin-proposal-function-bind',
  ],
};
