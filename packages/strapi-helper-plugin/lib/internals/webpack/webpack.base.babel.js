/**
 * COMMON WEBPACK CONFIGURATION
 */

const path = require('path');
const webpack = require('webpack');
const _ = require('lodash');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const { COMMON_ALIAS } = require('./configs/alias');
const foldersToInclude = require('./configs/foldersToInclude');
const { __NODE_ENV__, __PROD__ } = require('./configs/globals');
const paths = require('./configs/paths');
const URLs = require('./configs/server');
const pkg = require(paths.packageJson);
const pluginId = pkg.name.replace(/^strapi-/i, '');

module.exports = options => {
  // The disable option is only for production
  // Config from https://github.com/facebook/create-react-app/blob/next/packages/react-scripts/config/webpack.config.prod.js
  const extractSass = new ExtractTextPlugin({
    filename: '[name].[contenthash].css',
    disable: options.disableExtractTextPlugin || true,
  });

  const commonBabelPresets = [
    [
      require.resolve('babel-preset-env'),
      {
        es2015: {
          modules: false,
        },
      },
    ],
    require.resolve('babel-preset-react'),
    require.resolve('babel-preset-stage-0'),
  ];

  const commonDevtool = 'cheap-module-source-map';

  return {
    entry: options.entry,
    output: Object.assign(
      {
        // Compile into js/build.js
        path: paths.buildPath,
      },
      options.output,
    ), // Merge with env dependent settings.
    module: {
      rules: [
        // TODO: add eslint formatter
        {
          // "oneOf" will traverse all following loaders until one will
          // match the requirements. When no loader matches it will fall
          // back to the "file" loader at the end of the loader list.
          oneOf: [
            {
              test: /\.js$/, // Transform all .js files required somewhere with Babel,
              loader: require.resolve('babel-loader'),
              include: foldersToInclude,
              options: {
                presets: commonBabelPresets.concat(options.babelPresets),
                env: {
                  production: {
                    only: ['src'],
                    plugins: [
                      require.resolve('babel-plugin-transform-react-remove-prop-types'),
                      require.resolve('babel-plugin-transform-react-constant-elements'),
                      require.resolve('babel-plugin-transform-react-inline-elements'),
                      require.resolve('babel-plugin-transform-es2015-destructuring'),
                      require.resolve('babel-plugin-transform-es2015-parameters'),
                      require.resolve('babel-plugin-transform-object-rest-spread'),
                      [
                        require.resolve('babel-plugin-styled-components'),
                        { ssr: true, preprocess: true },
                      ],
                    ],
                  },
                  test: {
                    plugins: ['istanbul'],
                  },
                },
              },
            },
            // The notation here is somewhat confusing.
            // "postcss" loader applies autoprefixer to our CSS.
            // "css" loader resolves paths in CSS and adds assets as dependencies.
            // "style" loader normally turns CSS into JS modules injecting <style>,
            // but unlike in development configuration, we do something different.
            // `ExtractTextPlugin` first applies the "postcss" and "css" loaders
            // (second argument), then grabs the result CSS and puts it into a
            // separate file in our build process. This way we actually ship
            // a single CSS file in production instead of JS code injecting <style>
            // tags. If you use code splitting, however, any async bundles will still
            // use the "style" loader inside the async code so CSS from them won't be
            // in the main CSS file.
            {
              test: /\.css$/,
              include: /node_modules/,
              use: extractSass.extract({
                fallback: require.resolve('style-loader'),
                use: [
                  {
                    loader: require.resolve('css-loader'),
                    options: {
                      minimize: __PROD__,
                      sourceMap: false,
                    },
                  },
                  {
                    loader: require.resolve('postcss-loader'),
                    options: {
                      config: {
                        path: paths.postcssConfig,
                      },
                    },
                  },
                ],
              }),
            },
            {
              test: /\.scss$/,
              include: foldersToInclude,
              use: extractSass.extract({
                use: [
                  {
                    loader: require.resolve('css-loader'),
                    options: {
                      localIdentName: `${pluginId}[local]__[path][name]__[hash:base64:5]`,
                      modules: true,
                      importLoaders: 1,
                      sourceMap: false,
                      minimize: __PROD__,
                    },
                  },
                  {
                    loader: require.resolve('postcss-loader'),
                    options: {
                      config: {
                        path: paths.postcssConfig,
                      },
                    },
                  },
                  {
                    loader: 'sass-loader',
                  },
                ],
                fallback: require.resolve('style-loader'),
              }),
            },
            {
              test: /\.(eot|svg|otf|ttf|woff|woff2)$/,
              use: 'file-loader',
            },
            {
              test: /\.(jpg|png|gif)$/,
              loaders: [
                require.resolve('file-loader'),
                {
                  loader: require.resolve('image-webpack-loader'),
                  query: {
                    mozjpeg: {
                      progressive: true,
                    },
                    gifsicle: {
                      interlaced: false,
                    },
                    optipng: {
                      optimizationLevel: 4,
                    },
                    pngquant: {
                      quality: '65-90',
                      speed: 4,
                    },
                  },
                },
              ],
            },
            {
              test: /\.html$/,
              include: [path.join(paths.adminPath, 'admin', 'src')],
              use: require.resolve('html-loader'),
            },
            {
              test: /\.(mp4|webm)$/,
              loader: require.resolve('url-loader'),
              options: {
                limit: 10000,
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new webpack.ProvidePlugin({
        // make fetch available
        fetch: 'exports-loader?self.fetch!whatwg-fetch',
      }),
      // Always expose NODE_ENV to webpack, in order to use `process.env.NODE_ENV`
      // inside your code for any environment checks; UglifyJS will automatically
      // drop any unreachable code.
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(__NODE_ENV__),
          REMOTE_URL: JSON.stringify(URLs.host),
          BACKEND_URL: JSON.stringify(URLs.backend),
          MODE: JSON.stringify(URLs.mode), // Allow us to define the public path for the plugins assets.
        },
      }),
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      new webpack.NamedModulesPlugin(),
      extractSass,
    ].concat(options.plugins),
    resolve: {
      modules: [
        'admin/src',
        'node_modules/strapi-helper-plugin/lib/src',
        'node_modules/strapi-helper-plugin/node_modules',
        'node_modules',
      ],
      alias: _.isEmpty(options.alias) ? COMMON_ALIAS : options.alias,
      symlinks: false,
      extensions: ['.js', '.jsx', '.react.js'],
      mainFields: ['browser', 'jsnext:main', 'main'],
    },
    devtool: _.isEmpty(options.devtool) ? commonDevtool : options.devtool,
    externals: options.externals,
    resolveLoader: {
      modules: [
        path.join(__dirname, '..', '..', '..', 'node_modules'),
        path.join(process.cwd(), 'node_modules'),
      ],
    },
    target: 'web', // Make web variables accessible to webpack, e.g. window,
  };
};
