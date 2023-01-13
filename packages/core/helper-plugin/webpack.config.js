const webpack = require('webpack');
const { ESBuildMinifyPlugin } = require('esbuild-loader');

const packageJson = require('./package.json');

const nodeModules = [];
Object.keys(packageJson.peerDependencies).forEach((module) => {
  nodeModules.push(new RegExp(`^${module}(/.+)?$`));
});

/** @type {Omit<import('webpack').Configuration, 'output'>} */
const baseConfig = {
  entry: `${__dirname}/lib/src/index.js`,
  externals: nodeModules,
  mode: process.env.NODE_ENV,
  devtool: process.env.NODE_ENV === 'production' ? false : 'eval-source-map',
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    minimizer: [
      new ESBuildMinifyPlugin({
        target: 'es2015',
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.m?jsx?$/,
        use: {
          loader: require.resolve('esbuild-loader'),
          options: {
            loader: 'jsx',
            target: 'es2015',
          },
        },
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8192,
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['*', '.js'],
    cacheWithContext: false,
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
    }),
  ],
};

/** @type {import('webpack').Configuration[]} */
const config = [
  {
    ...baseConfig,
    output: {
      path: `${__dirname}/build`,
      filename: `helper-plugin.${process.env.NODE_ENV}.js`,
      library: {
        name: 'helperPlugin',
        type: 'umd',
      },
      umdNamedDefine: true,
    },
  },
  {
    ...baseConfig,
    output: {
      path: `${__dirname}/build`,
      filename: `helper-plugin.esm.js`,
      library: {
        type: 'module',
      },
    },
    experiments: {
      outputModule: true,
    },
  },
  {
    ...baseConfig,
    output: {
      path: `${__dirname}/build`,
      filename: `helper-plugin.cjs.js`,
      library: {
        type: 'commonjs',
      },
    },
  },
];

module.exports = config;
