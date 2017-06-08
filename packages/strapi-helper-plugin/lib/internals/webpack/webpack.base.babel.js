/**
 * COMMON WEBPACK CONFIGURATION
 */

const path = require('path');

const webpack = require('webpack');

module.exports = (options) => ({
  entry: options.entry,
  output: Object.assign({ // Compile into js/build.js
    path: path.resolve(process.cwd(), 'build'),
    publicPath: '/',
  }, options.output), // Merge with env dependent settings
  module: {
    loaders: [{
      test: /\.js$/, // Transform all .js files required somewhere with Babel
      use: {
        loader: 'babel',
        options: {
          "presets": [
            [
              require.resolve('babel-preset-latest'),
              {
                "es2015": {
                  "modules": false,
                },
              },
            ],
            require.resolve('babel-preset-react'),
            require.resolve('babel-preset-stage-0'),
          ],
          "env": {
            "production": {
              "only": [
                "src",
              ],
              "plugins": [
                require.resolve('babel-plugin-transform-react-remove-prop-types'),
                require.resolve('babel-plugin-transform-react-constant-elements'),
                require.resolve('babel-plugin-transform-react-inline-elements'),
              ],
            },
            "test": {
              "plugins": [
                "istanbul",
              ],
            },
          },
        },
      },
      include: [
        path.join(process.cwd(), 'admin', 'src'),
        // Add the `strapi-helper-plugin` folders watched by babel
        path.join(process.cwd(), 'node_modules', 'strapi-helper-plugin', 'lib', 'src'),
      ],
    }, {
      // Transform our own .scss files
      test: /\.scss$/,
      exclude: /node_modules/,
      // loader: 'null-loader'
      use: options.cssLoaders,
    }, {
      // Do not transform vendor's CSS with CSS-modules
      // The point is that they remain in global scope.
      // Since we require these CSS files in our JS or CSS files,
      // they will be a part of our compilation either way.
      // So, no need for ExtractTextPlugin here.
      test: /\.css$/,
      include: /node_modules/,
      loaders: ['style-loader', 'css-loader'],
    }, {
      test: /\.(eot|svg|ttf|woff|woff2)$/,
      loader: 'file-loader',
    }, {
      test: /\.(jpg|png|gif)$/,
      loaders: [
        'file-loader',
        'image-webpack?{progressive:true, optimizationLevel: 7, interlaced: false, pngquant:{quality: "65-90", speed: 4}}',
      ],
    }, {
      test: /\.json$/,
      loader: 'json-loader',
    }, {
      test: /\.(mp4|webm)$/,
      loader: 'url-loader?limit=10000',
    }],
  },
  plugins: options.plugins.concat([
    new webpack.ProvidePlugin({
      // make fetch available
      fetch: 'exports?self.fetch!whatwg-fetch',
    }),

    // Always expose NODE_ENV to webpack, in order to use `process.env.NODE_ENV`
    // inside your code for any environment checks; UglifyJS will automatically
    // drop any unreachable code.
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      },
    }),
    new webpack.NamedModulesPlugin(),
  ]),
  resolve: {
    modules: [
      'admin/src',
      'node_modules/strapi-helper-plugin/lib/src',
      'node_modules/strapi-helper-plugin/node_modules',
      'node_modules',
    ],
    symlinks: false,
    extensions: [
      '.js',
      '.jsx',
      '.react.js',
    ],
    mainFields: [
      'browser',
      'jsnext:main',
      'main',
    ],
  },

  resolveLoader: {
    modules: [
      path.join(__dirname, '..', '..', '..', 'node_modules'),
      path.join(process.cwd(), 'node_modules'),
    ],
  },
  devtool: options.devtool,
  target: 'web', // Make web variables accessible to webpack, e.g. window
});
