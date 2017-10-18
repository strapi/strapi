/**
 * COMMON WEBPACK CONFIGURATION
 */

const fs = require('fs');
const path = require('path');

const webpack = require('webpack');

const pkg = require(path.resolve(process.cwd(), 'package.json'));
const pluginId = pkg.name.replace(/^strapi-/i, '');

let noPlugin = false;
let plugins = [];
let pluginFolders = {};

if (process.env.npm_lifecycle_event === 'start') {
  try {
    fs.accessSync(path.resolve(process.env.PWD, '..', 'plugins'), fs.constants.R_OK);
  } catch (e) {
    try {
      fs.accessSync(path.resolve(process.env.PWD, '..', 'api'), fs.constants.R_OK);

      // Allow app without plugins.
      noPlugin = true;
    } catch (e) {
      throw new Error(`You need to start the WebPack server from the /admin directory in a Strapi's project.`);
    }
  }

  plugins = process.env.IS_ADMIN === 'true' && !noPlugin ? fs.readdirSync(path.resolve(process.env.PWD, '..', 'plugins'))
    .filter(x => x[0] !== '.') : [];

  pluginFolders = plugins.reduce((acc, current) => {
    acc[current] = path.resolve(process.env.PWD, '..', 'plugins', current, 'node_modules', 'strapi-helper-plugin', 'lib', 'src');

    return acc;
  }, {});
}

module.exports = (options) => ({
  entry: options.entry,
  output: Object.assign({ // Compile into js/build.js
    path: path.resolve(process.cwd(), 'admin', 'build'),
    publicPath: '/',
  }, options.output), // Merge with env dependent settings
  module: {
    loaders: [{
      test: /\.js$/, // Transform all .js files required somewhere with Babel,
      use: {
        loader: 'babel-loader',
        options: {
          presets: options.babelPresets,
          env: {
            production: {
              only: [
                'src',
              ],
              plugins: [
                require.resolve('babel-plugin-transform-react-remove-prop-types'),
                require.resolve('babel-plugin-transform-react-constant-elements'),
                require.resolve('babel-plugin-transform-react-inline-elements'),
              ],
            },
            test: {
              plugins: [
                'istanbul',
              ],
            },
          },
        },
      },
      include: [path.join(process.cwd(), 'admin', 'src')]
        .concat(plugins.reduce((acc, current) => {
          acc.push(path.resolve(process.env.PWD, '..', 'plugins', current, 'admin', 'src'), pluginFolders[current]);

          return acc;
        }, []))
        .concat([path.join(process.cwd(), 'node_modules', 'strapi-helper-plugin', 'lib', 'src')])
    }, {
      // Transform our own .scss files
      test: /\.scss$/,
      use: [{
        loader: 'style-loader',
      }, {
        loader: 'css-loader',
        options: {
          localIdentName: `${pluginId}[local]__[path][name]__[hash:base64:5]`,
          modules: true,
          importLoaders: 1,
          sourceMap: true,
          minimize: process.env.NODE_ENV === 'production'
        },
      }, {
        loader: 'postcss-loader',
        options: {
          config: {
            path: path.resolve(__dirname, '..', 'postcss', 'postcss.config.js'),
          },
        },
      }, {
        loader: 'sass-loader',
      }],
    }, {
      // Do not transform vendor's CSS with CSS-modules
      // The point is that they remain in global scope.
      // Since we require these CSS files in our JS or CSS files,
      // they will be a part of our compilation either way.
      // So, no need for ExtractTextPlugin here.
      test: /\.css$/,
      include: /node_modules/,
      loaders: ['style-loader', {
        loader: 'css-loader',
        options: {
          minimize: process.env.NODE_ENV === 'production',
          sourceMap: true,
        }
      }],
    }, {
      test: /\.(eot|svg|ttf|woff|woff2)$/,
      loader: 'file-loader',
    }, {
      test: /\.(jpg|png|gif)$/,
      loaders: [
        'file-loader',
        {
          loader: 'image-webpack-loader',
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
    }, {
      test: /\.html$/,
      loader: 'html-loader',
    }, {
      test: /\.json$/,
      loader: 'json-loader',
    }, {
      test: /\.(mp4|webm)$/,
      loader: 'url-loader?limit=10000',
    }],
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
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      },
    }),
    new webpack.NamedModulesPlugin()
  ].concat(options.plugins),
  resolve: {
    modules: [
      'admin/src',
      'node_modules/strapi-helper-plugin/lib/src',
      'node_modules/strapi-helper-plugin/node_modules',
      'node_modules',
    ],
    alias: options.alias,
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
  externals: options.externals,
  resolveLoader: {
    modules: [
      path.join(__dirname, '..', '..', '..', 'node_modules'),
      path.join(process.cwd(), 'node_modules'),
    ],
  },
  devtool: options.devtool,
  target: 'web', // Make web variables accessible to webpack, e.g. window,
});
