// Important modules this config uses
const path = require('path');
const _ = require('lodash');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const cssnext = require('postcss-cssnext');
const postcssFocus = require('postcss-focus');
const postcssReporter = require('postcss-reporter');
const webpack = require('webpack');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const base = require('./webpack.base.babel');

const isAdmin = process.env.IS_ADMIN === 'true';
// const isSetup = path.resolve(process.env.PWD, '..', '..') === path.resolve(process.env.INIT_CWD);
const isSetup = process.env.IS_MONOREPO || false;
const appPath = process.env.APP_PATH || path.resolve(process.env.PWD || process.cwd(), '..', isAdmin ? '' : '..');
const adminPath = (() => {
  if (isSetup) {
    return isAdmin ? path.resolve(appPath, 'strapi-admin') : path.resolve(process.env.PWD || process.cwd(), '..');
  }

  return path.resolve(appPath, 'admin');
})();

const rootAdminpath = (() => {
  if (isSetup) {
    return isAdmin
      ? path.resolve(appPath, 'strapi-admin')
      : path.resolve(appPath, 'packages', 'strapi-admin');
  }
  return path.resolve(appPath, 'admin');
})();

const plugins = [
  new webpack.DllReferencePlugin({
    manifest: require(path.resolve(rootAdminpath, 'admin', 'src', 'config', 'manifest.json')),
  }),
  // Minify and optimize the JavaScript
  new webpack.optimize.UglifyJsPlugin({
    sourceMap: true,
    parallel: true,
    compress: {
      warnings: false,
    },
    uglifyOptions: {
      ecma: 8,
    },
  }),
  new webpack.LoaderOptionsPlugin({
    minimize: true,
  }),
  new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
  // new BundleAnalyzerPlugin(),
];

let publicPath;

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
    const server = require(serverConfig);

    if ((process.env.PWD || process.cwd()).indexOf('/admin') !== -1) {
      if (_.get(server, 'admin.build.host')) {
        publicPath = _.get(server, 'admin.build.host', '/admin').replace(/\/$/, '') || '/';
      } else {
        publicPath = _.get(server, 'admin.path', '/admin');
      }
    }
  } catch (e) {
    throw new Error(`Impossible to access to ${serverConfig}`);
  }
}

// Build the `index.html file`
if (isAdmin) {
  plugins.push(
    new HtmlWebpackPlugin({
      template: 'admin/src/index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
      chunksSortMode: 'manual',
      chunks: ['main'],
      inject: true,
    }),
  );
  plugins.push(
    new AddAssetHtmlPlugin({
      filepath: path.resolve(__dirname, 'dist/*.dll.js'),
    }),
  );
  plugins.push(
    new CopyWebpackPlugin([
      {
        from: 'config/plugins.json',
        context: path.resolve(adminPath, 'admin', 'src'),
        to: 'config/plugins.json',
      },
    ]),
  );
}

const main = (() => {
  if (isAdmin && isSetup) {
    return path.join(process.cwd(), 'admin', 'src', 'app.js');
  } else if (isAdmin) {
    return path.join(appPath, 'admin', 'admin', 'src', 'app.js');
  }

  return path.join(process.env.PWD || process.cwd(), 'node_modules', 'strapi-helper-plugin', 'lib', 'src', 'app.js');
})();

module.exports = base({
  // In production, we skip all hot-reloading stuff
  entry: {
    main,
  },

  // Utilize long-term caching by adding content hashes (not compilation hashes) to compiled assets
  output: _.omitBy(
    {
      filename: '[name].js',
      chunkFilename: '[name].[chunkhash].chunk.js',
      publicPath,
    },
    _.isUndefined,
  ),

  // In production, we minify our CSS with cssnano
  postcssPlugins: [
    postcssFocus(),
    cssnext({
      browsers: ['last 2 versions', 'IE > 10'],
    }),
    postcssReporter({
      clearMessages: true,
    }),
  ],

  // Plugins
  plugins,

  // Babel presets configuration
  babelPresets: [
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
  ],

  alias: {
    moment: 'moment/moment.js',
    'babel-polyfill': path.resolve(
      rootAdminpath,
      'node_modules',
      'strapi-helper-plugin',
      'node_modules',
      'babel-polyfill',
    ),
    lodash: path.resolve(
      rootAdminpath,
      'node_modules',
      'strapi-helper-plugin',
      'node_modules',
      'lodash',
    ),
    immutable: path.resolve(
      rootAdminpath,
      'node_modules',
      'strapi-helper-plugin',
      'node_modules',
      'immutable',
    ),
    'react-intl': path.resolve(
      rootAdminpath,
      'node_modules',
      'strapi-helper-plugin',
      'node_modules',
      'react-intl',
    ),
    react: path.resolve(
      rootAdminpath,
      'node_modules',
      'strapi-helper-plugin',
      'node_modules',
      'react',
    ),
    'react-dom': path.resolve(
      rootAdminpath,
      'node_modules',
      'strapi-helper-plugin',
      'node_modules',
      'react-dom',
    ),
    'react-transition-group': path.resolve(
      rootAdminpath,
      'node_modules',
      'strapi-helper-plugin',
      'node_modules',
      'react-transition-group',
    ),
    'react-copy-to-clipboard': path.resolve(
      rootAdminpath,
      'node_modules',
      'strapi-helper-plugin',
      'node_modules',
      'react-copy-to-clipboard',
    ),
    reactstrap: path.resolve(
      rootAdminpath,
      'node_modules',
      'strapi-helper-plugin',
      'node_modules',
      'reactstrap',
    ),
    'styled-components': path.resolve(
      rootAdminpath,
      'node_modules',
      'strapi-helper-plugin',
      'node_modules',
      'styled-components',
    ),
  },

  devtool: 'cheap-module-source-map',
  disableExtractTextPlugin: false,
  externals: {},
});
