'use strict';

const path = require('path');
const fs = require('fs-extra');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const chalk = require('chalk');
const {
  createCacheDir,
  getCustomWebpackConfig,
  shouldBuildAdmin,
  watchAdminFiles,
} = require('./utils');

async function build({ plugins, dir, env, options, optimize, forceBuild, useTypeScript }) {
  const buildAdmin = await shouldBuildAdmin({ dir, plugins, useTypeScript });

  if (!buildAdmin && !forceBuild) {
    return;
  }

  // Create the cache dir containing the front-end files.
  await createCacheDir({ dir, plugins, useTypeScript });

  const cacheDir = path.resolve(dir, '.cache');
  const entry = path.resolve(cacheDir, 'admin', 'src');
  const dest = path.resolve(dir, 'build');

  // Roots for the @strapi/babel-plugin-switch-ee-ce
  const roots = {
    eeRoot: path.resolve(cacheDir, 'ee', 'admin'),
    ceRoot: path.resolve(cacheDir, 'admin', 'src'),
  };

  const pluginsPath = Object.keys(plugins).map(pluginName => plugins[pluginName].pathToPlugin);

  const config = getCustomWebpackConfig(dir, {
    entry,
    pluginsPath,
    cacheDir,
    dest,
    env,
    options,
    optimize,
    roots,
    useTypeScript,
  });

  const compiler = webpack(config);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        console.error(err.stack || err);

        if (err.details) {
          console.error(err.details);
        }
        return reject(err);
      }

      const info = stats.toJson();

      if (stats.hasErrors()) {
        console.error(info.errors);
      }

      return resolve({
        stats,

        warnings: info.warnings,
      });
    });
  });
}

async function clean({ dir }) {
  const buildDir = path.join(dir, 'build');
  const cacheDir = path.join(dir, '.cache');

  fs.removeSync(buildDir);
  fs.removeSync(cacheDir);
}

async function watchAdmin({ plugins, dir, host, port, browser, options, useTypeScript }) {
  // Create the cache dir containing the front-end files.
  const cacheDir = path.join(dir, '.cache');
  await createCacheDir({ dir, plugins, useTypeScript });

  const entry = path.join(cacheDir, 'admin', 'src');
  const dest = path.join(dir, 'build');
  const env = 'development';

  // Roots for the @strapi/babel-plugin-switch-ee-ce
  const roots = {
    eeRoot: path.resolve(cacheDir, 'ee', 'admin'),
    ceRoot: path.resolve(cacheDir, 'admin', 'src'),
  };

  const pluginsPath = Object.keys(plugins).map(pluginName => plugins[pluginName].pathToPlugin);

  const args = {
    entry,
    cacheDir,
    pluginsPath,
    dest,
    env,
    port,
    options,
    roots,
    useTypeScript,
    devServer: {
      port,
      client: {
        logging: 'none',
        overlay: {
          errors: true,
          warnings: false,
        },
      },

      open: browser === 'true' ? true : browser,
      devMiddleware: {
        publicPath: options.adminPath,
      },
      historyApiFallback: {
        index: options.adminPath,
        disableDotRule: true,
      },
    },
  };

  const webpackConfig = getCustomWebpackConfig(dir, args);

  const compiler = webpack(webpackConfig);

  const server = new WebpackDevServer(args.devServer, compiler);

  const runServer = async () => {
    console.log(chalk.green('Starting the development server...'));
    console.log();
    console.log(chalk.green(`Admin development at http://${host}:${port}${options.adminPath}`));

    await server.start();
  };

  runServer();

  watchAdminFiles(dir, useTypeScript);
}

module.exports = {
  clean,
  build,
  watchAdmin,
};
