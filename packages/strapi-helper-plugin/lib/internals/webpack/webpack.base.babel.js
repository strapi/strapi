/**
 * COMMON WEBPACK CONFIGURATION
 */

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

const pkg = require(path.resolve(process.cwd(), 'package.json'));
const pluginId = pkg.name.replace(/^strapi-/i, '');
const isAdmin = process.env.IS_ADMIN === 'true';

const appPath = (() => {
  if (process.env.APP_PATH) {
    return process.env.APP_PATH;
  }

  return isAdmin ? path.resolve(process.env.PWD, '..') : path.resolve(process.env.PWD, '..', '..');
})();
const isSetup = path.resolve(process.env.PWD, '..', '..') === path.resolve(process.env.INIT_CWD);
const adminPath = (() => {
  if (isSetup) {
    return isAdmin ? path.resolve(appPath, 'strapi-admin') : path.resolve(process.env.PWD);
  }

  return path.resolve(appPath, 'admin');
})();

if (!isSetup) {
  try {
    // Load app' configurations to update `plugins.json` automatically.
    const strapi = require(path.join(appPath, 'node_modules', 'strapi'));

    strapi.config.appPath = appPath;
    strapi.log.level = 'silent';

    (async () => {
      await strapi.load({
        environment: process.env.NODE_ENV
      });
    })();
  } catch (e) {
    console.log(e);
    throw new Error(`You need to start the WebPack server from the /admin or /plugins/**/admin directories in a Strapi's project.`);
  }
}

// Define remote and backend URLs.
const URLs = {
  host: '/admin',
  backend: '/'
};

if (isAdmin && !isSetup) {
  // Load server configuration.
  const serverConfig = path.resolve(appPath, 'config', 'environments', _.lowerCase(process.env.NODE_ENV), 'server.json');

  try {
    const server = require(serverConfig);
    const path = _.get(server, 'admin.path', '/admin');

    if (process.env.PWD.indexOf('/admin') !== -1) {
      URLs.host = _.get(server, 'admin.path', '/admin');

      URLs.backend = _.get(server, 'admin.build.backend', `/`);
    }
  } catch (e) {
    throw new Error(`Impossible to access to ${serverConfig}`)
  }
}

// Load plugins into the same build in development mode.
const plugins = {
  exist: false,
  src: [],
  folders: {}
};

if (process.env.npm_lifecycle_event === 'start') {
  try {
    fs.accessSync(path.resolve(appPath, 'plugins'), fs.constants.R_OK);
  } catch (e) {
    // Allow app without plugins.
    plugins.exist = true;
  }

  // Read `plugins` directory.
  plugins.src = isAdmin && !plugins.exist ? fs.readdirSync(path.resolve(appPath, 'plugins')).filter(x => x[0] !== '.') : [];

  // Construct object of plugin' paths.
  plugins.folders = plugins.src.reduce((acc, current) => {
    acc[current] = path.resolve(appPath, 'plugins', current, 'node_modules', 'strapi-helper-plugin', 'lib', 'src');

    return acc;
  }, {});
}

module.exports = (options) => ({
  entry: options.entry,
  output: Object.assign({ // Compile into js/build.js
    path: path.join(adminPath, 'admin', 'build')
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
      include: [path.join(adminPath, 'admin', 'src')]
        .concat(plugins.src.reduce((acc, current) => {
          acc.push(path.resolve(appPath, 'plugins', current, 'admin', 'src'), plugins.folders[current]);

          return acc;
        }, []))
        .concat([path.join(adminPath, 'node_modules', 'strapi-helper-plugin', 'lib', 'src')])
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
        REMOTE_URL: JSON.stringify(URLs.host),
        BACKEND_URL: JSON.stringify(URLs.backend),
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
