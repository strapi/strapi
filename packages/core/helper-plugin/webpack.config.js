const browserslistToEsbuild = require('browserslist-to-esbuild');
const { ESBuildMinifyPlugin } = require('esbuild-loader');
const webpack = require('webpack');

const packageJson = require('./package.json');

const nodeModules = [];
[...Object.keys(packageJson.dependencies), ...Object.keys(packageJson.peerDependencies)].forEach(
  (module) => {
    nodeModules.push(new RegExp(`^${module}(/.+)?$`));
  }
);

/** @type {Omit<import('webpack').Configuration, 'output'>} */
const baseConfig = {
  entry: `${__dirname}/src/index.js`,
  externals: nodeModules,
  mode: process.env.NODE_ENV,
  devtool: process.env.NODE_ENV === 'production' ? false : 'eval-source-map',
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    minimizer: [
      new ESBuildMinifyPlugin({
        target: browserslistToEsbuild(),
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.[jtm]sx?$/,
        use: {
          loader: require.resolve('esbuild-loader'),
          options: {
            loader: 'tsx',
            target: browserslistToEsbuild(),
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
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
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
      filename: `helper-plugin.esm.js`,
      library: {
        type: 'module',
      },
      environment: { module: true },
    },
    experiments: {
      outputModule: true,
    },
  },
  {
    ...baseConfig,
    output: {
      path: `${__dirname}/build`,
      filename: `helper-plugin.js`,
      library: {
        type: 'commonjs',
      },
    },
  },
];

module.exports = config;
