/**
 * COMMON WEBPACK CONFIGURATION
 */

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const _ = require('lodash');

const pkg = require(path.resolve(process.cwd(), 'package.json'));
const pluginId = pkg.name.replace(/^strapi-/i, '');
const isAdmin = process.env.IS_ADMIN === 'true';

const ExtractTextPlugin = require('extract-text-webpack-plugin');

const appPath = (() => {
  if (process.env.APP_PATH) {
    return process.env.APP_PATH;
  }

  return isAdmin ? path.resolve(process.env.PWD, '..') : path.resolve(process.env.PWD, '..', '..');
})();
// const isSetup = path.resolve(process.env.PWD, '..', '..') === path.resolve(process.env.INIT_CWD);
const isSetup = process.env.IS_MONOREPO;

const adminPath = (() => {
  if (isAdmin && isSetup) {
    return path.resolve(appPath, 'strapi-admin');
  }

  return path.resolve(process.env.PWD);
})();

// Define remote and backend URLs.
const URLs = {
  host: '/admin',
  backend: '/',
  publicPath: null,
  mode: 'host',
};

if (isAdmin && !isSetup) {
  // Load server configuration.
  const serverConfig = path.resolve(
    appPath,
    'config',
    'environments',
    _.lowerCase(process.env.NODE_ENV),
    'server.json',
  );

  try {
    const { templateConfiguration } = require(path.join(adminPath, 'node_modules', 'strapi-utils'));

    let server = require(serverConfig);
    server = templateConfiguration(server);

    if (process.env.PWD.indexOf('/admin') !== -1) {
      if (_.get(server, 'admin.build.host')) {
        URLs.host = _.get(server, 'admin.build.host', '/admin').replace(/\/$/, '') || '/';
      } else {
        URLs.host = _.get(server, 'admin.path', '/admin');
      }

      URLs.publicPath = URLs.host;
      URLs.backend = _.get(server, 'admin.build.backend', '/');

      if (_.get(server, 'admin.build.plugins.source') === 'backend') {
        URLs.mode = 'backend';
      }

      if (process.env.npm_lifecycle_event === 'start') {
        URLs.backend = `http://${_.get(server, 'host', 'localhost')}:${_.get(server, 'port', 1337)}`;
      }
    }
  } catch (e) {
    throw new Error(`Impossible to access to ${serverConfig}`);
  }
}

// Load plugins into the same build in development mode.
const plugins = {
  exist: false,
  src: [],
  folders: {},
};

if (process.env.npm_lifecycle_event === 'start') {
  try {
    fs.accessSync(path.resolve(appPath, 'plugins'), fs.constants.R_OK);
  } catch (e) {
    // Allow app without plugins.
    plugins.exist = true;
  }

  // Read `plugins` directory and check if the plugin comes with an UI (it has an App container).
  // If we don't do this check webpack expects the plugin to have a containers/App/reducer.js to create
  // the plugin's store (redux).
  plugins.src =
    isAdmin && !plugins.exist
      ? fs.readdirSync(path.resolve(appPath, 'plugins')).filter(x => {
          let hasAdminFolder;

          try {
            fs.accessSync(path.resolve(appPath, 'plugins', x, 'admin', 'src', 'containers', 'App'));
            hasAdminFolder = true;
          } catch (err) {
            hasAdminFolder = false;
          }
          return x[0] !== '.' && hasAdminFolder;
        })
      : [];

  // Construct object of plugin' paths.
  plugins.folders = plugins.src.reduce((acc, current) => {
    acc[current] = path.resolve(
      appPath,
      'plugins',
      current,
      'node_modules',
      'strapi-helper-plugin',
      'lib',
      'src',
    );

    return acc;
  }, {});
}

// Tell webpack to use a loader only for those files
const foldersToInclude = [path.join(adminPath, 'admin', 'src')]
  .concat(
    plugins.src.reduce((acc, current) => {
      acc.push(path.resolve(appPath, 'plugins', current, 'admin', 'src'), plugins.folders[current]);

      return acc;
    }, []),
  )
  .concat([path.join(adminPath, 'node_modules', 'strapi-helper-plugin', 'lib', 'src')]);

module.exports = options => {
  // The disable option is only for production
  // Config from https://github.com/facebook/create-react-app/blob/next/packages/react-scripts/config/webpack.config.prod.js
  const extractSass = new ExtractTextPlugin({
    filename: '[name].[contenthash].css',
    disable: options.disableExtractTextPlugin || true,
  });

  return {
    entry: options.entry,
    output: Object.assign(
      {
        // Compile into js/build.js
        path: path.join(adminPath, 'admin', 'build'),
      },
      options.output,
    ), // Merge with env dependent settings
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
                presets: options.babelPresets,
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
                      [require.resolve('babel-plugin-styled-components'), { ssr: true, preprocess: true }],
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
                      minimize: process.env.NODE_ENV === 'production',
                      sourceMap: false,
                    },
                  },
                  {
                    loader: require.resolve('postcss-loader'),
                    options: {
                      config: {
                        path: path.resolve(__dirname, '..', 'postcss', 'postcss.config.js'),
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
                      minimize: process.env.NODE_ENV === 'production',
                    },
                  },
                  {
                    loader: require.resolve('postcss-loader'),
                    options: {
                      config: {
                        path: path.resolve(__dirname, '..', 'postcss', 'postcss.config.js'),
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
              include: [path.join(adminPath, 'admin', 'src')],
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
          NODE_ENV: JSON.stringify(process.env.NODE_ENV),
          REMOTE_URL: JSON.stringify(URLs.host),
          BACKEND_URL: JSON.stringify(URLs.backend),
          MODE: JSON.stringify(URLs.mode), // Allow us to define the public path for the plugins assets.
        },
      }),
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
      alias: options.alias,
      symlinks: false,
      extensions: ['.js', '.jsx', '.react.js'],
      mainFields: ['browser', 'jsnext:main', 'main'],
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
  };
};
