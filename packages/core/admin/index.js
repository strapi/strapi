'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const chalk = require('chalk');
const chokidar = require('chokidar');
const getWebpackConfig = require('./webpack.config');

const getPkgPath = name => path.dirname(require.resolve(`${name}/package.json`));

const DEFAULT_PLUGINS = [
  'content-type-builder',
  'content-manager',
  'upload',
  'email',
  'i18n',
  'users-permissions',
];

function getCustomWebpackConfig(dir, config) {
  const adminConfigPath = path.join(dir, 'src', 'admin', 'webpack.config.js');

  let webpackConfig = getWebpackConfig(config);

  if (fs.existsSync(adminConfigPath)) {
    const webpackAdminConfig = require(path.resolve(adminConfigPath));

    if (_.isFunction(webpackAdminConfig)) {
      webpackConfig = webpackAdminConfig(webpackConfig, webpack);

      if (!webpackConfig) {
        console.error(
          `${chalk.red('Error:')} Nothing was returned from your custom webpack configuration`
        );
        process.exit(1);
      }
    }
  }

  return webpackConfig;
}

async function build({ plugins, dir, env, options, optimize, forceBuild }) {
  const buildAdmin = await shouldBuildAdmin({ dir, plugins });

  if (!buildAdmin && !forceBuild) {
    return;
  }

  // Create the cache dir containing the front-end files.
  await createCacheDir({ dir, plugins });

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

async function createPluginsJs(plugins, dest) {
  const pluginsArray = plugins.map(({ pathToPlugin, name }) => {
    const shortName = _.camelCase(name);

    /**
     * path.join, on windows, it uses backslashes to resolve path.
     * The problem is that Webpack does not windows paths
     * With this tool, we need to rely on "/" and not "\".
     * This is the reason why '..\\..\\..\\node_modules\\@strapi\\plugin-content-type-builder/strapi-admin.js' was not working.
     * The regexp at line 105 aims to replace the windows backslashes by standard slash so that webpack can deal with them.
     * Backslash looks to work only for absolute paths with webpack => https://webpack.js.org/concepts/module-resolution/#absolute-paths
     */
    const realPath = path
      .join(path.relative(path.resolve(dest, 'admin', 'src'), pathToPlugin), 'strapi-admin.js')
      .replace(/\\/g, '/');

    return {
      name,
      pathToPlugin: realPath,
      shortName,
    };
  });

  const content = `
${pluginsArray
  .map(({ pathToPlugin, shortName }) => {
    const req = `'${pathToPlugin}'`;

    return `import ${shortName} from ${req};`;
  })
  .join('\n')}


const plugins = {
${[...pluginsArray]
  .map(({ name, shortName }) => {
    return `  '${name}': ${shortName},`;
  })
  .join('\n')}
};

export default plugins;
`;

  return fs.writeFile(path.resolve(dest, 'admin', 'src', 'plugins.js'), content);
}

async function clean({ dir }) {
  const buildDir = path.join(dir, 'build');
  const cacheDir = path.join(dir, '.cache');

  fs.removeSync(buildDir);
  fs.removeSync(cacheDir);
}

async function copyAdmin(dest) {
  const adminPath = getPkgPath('@strapi/admin');

  // TODO copy ee folders for plugins
  await fs.copy(path.resolve(adminPath, 'ee', 'admin'), path.resolve(dest, 'ee', 'admin'));

  await fs.ensureDir(path.resolve(dest, 'config'));
  await fs.copy(path.resolve(adminPath, 'admin'), path.resolve(dest, 'admin'));

  // Copy package.json
  await fs.copy(path.resolve(adminPath, 'package.json'), path.resolve(dest, 'package.json'));
}

async function createCacheDir({ dir, plugins }) {
  const cacheDir = path.resolve(dir, '.cache');

  const pluginsWithFront = Object.keys(plugins)
    .filter(pluginName => {
      const pluginInfo = plugins[pluginName];
      return fs.existsSync(path.resolve(pluginInfo.pathToPlugin, 'strapi-admin.js'));
    })
    .map(name => ({ name, ...plugins[name] }));

  // create .cache dir
  await fs.emptyDir(cacheDir);

  // copy admin core code
  await copyAdmin(cacheDir);

  // Copy app.js
  const customAdminConfigFilePath = path.join(dir, 'src', 'admin', 'app.js');

  if (fs.existsSync(customAdminConfigFilePath)) {
    await fs.copy(customAdminConfigFilePath, path.resolve(cacheDir, 'admin', 'src', 'app.js'));
  }

  // Copy admin extensions folder
  const adminExtensionFolder = path.join(dir, 'src', 'admin', 'extensions');

  if (fs.existsSync(adminExtensionFolder)) {
    await fs.copy(adminExtensionFolder, path.resolve(cacheDir, 'admin', 'src', 'extensions'));
  }

  // create plugins.js with plugins requires
  await createPluginsJs(pluginsWithFront, cacheDir);
}

async function watchAdmin({ plugins, dir, host, port, browser, options }) {
  // Create the cache dir containing the front-end files.
  const cacheDir = path.join(dir, '.cache');
  await createCacheDir({ dir, plugins });

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
  };

  const webpackConfig = getCustomWebpackConfig(dir, args);
  const opts = {
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

    ...webpack(webpackConfig).options.devServer,
  };

  const server = new WebpackDevServer(opts, webpack(webpackConfig));

  server.start(port, host, function(err) {
    if (err) {
      console.log(err);
    }

    console.log(chalk.green('Starting the development server...'));
    console.log();
    console.log(chalk.green(`Admin development at http://${host}:${port}${options.adminPath}`));
  });

  watchFiles(dir);
}

/**
 * Listen to files change and copy the changed files in the .cache/admin folder
 * when using the dev mode
 * @param {string} dir
 */
async function watchFiles(dir) {
  const cacheDir = path.join(dir, '.cache');
  const appExtensionFile = path.join(dir, 'src', 'admin', 'app.js');
  const extensionsPath = path.join(dir, 'src', 'admin', 'extensions');

  // Only watch the admin/app.js file and the files that are in the ./admin/extensions/folder
  const filesToWatch = [appExtensionFile, extensionsPath];

  const watcher = chokidar.watch(filesToWatch, {
    ignoreInitial: true,
    ignorePermissionErrors: true,
  });

  watcher.on('all', async (event, filePath) => {
    const isAppFile = filePath.includes(appExtensionFile);

    // The app.js file needs to be copied in the .cache/admin/src/app.js and the other ones needs to
    // be copied in the .cache/admin/src/extensions folder
    const targetPath = isAppFile
      ? path.join(path.normalize(filePath.split(appExtensionFile)[1]), 'app.js')
      : path.join('extensions', path.normalize(filePath.split(extensionsPath)[1]));

    const destFolder = path.join(cacheDir, 'admin', 'src');

    if (event === 'unlink' || event === 'unlinkDir') {
      // Remove the file or folder
      // We need to copy the original files when deleting an override one
      try {
        fs.removeSync(path.join(destFolder, targetPath));
      } catch (err) {
        console.log('An error occured while deleting the file', err);
      }
    } else {
      // In any other case just copy the file into the .cache/admin/src folder
      try {
        await fs.copy(filePath, path.join(destFolder, targetPath));
      } catch (err) {
        console.log(err);
      }
    }
  });
}

const hasCustomAdminCode = async dir => {
  const customAdminPath = path.join(dir, 'src', 'admin');
  const customAdminConfigFile = path.join(customAdminPath, 'app.js');
  const customAdminWebpackFile = path.join(customAdminPath, 'webpack.config.js');

  const hasCustomConfigFile = await fs.pathExists(customAdminConfigFile);
  const hasCustomWebpackFile = await fs.pathExists(customAdminWebpackFile);

  return hasCustomConfigFile || hasCustomWebpackFile;
};

const hasNonDefaultPlugins = plugins => {
  const diff = _.difference(Object.keys(plugins), DEFAULT_PLUGINS);

  return diff.length > 0;
};

async function shouldBuildAdmin({ dir, plugins }) {
  const appHasCustomAdminCode = await hasCustomAdminCode(dir);
  const appHasNonDefaultPlugins = hasNonDefaultPlugins(plugins);

  return appHasCustomAdminCode || appHasNonDefaultPlugins;
}

module.exports = {
  clean,
  build,
  watchAdmin,
};
