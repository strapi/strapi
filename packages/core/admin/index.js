'use strict';
/* eslint-disable no-useless-escape */
const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const chalk = require('chalk');
const getWebpackConfig = require('./webpack.config');

const getPkgPath = name => path.dirname(require.resolve(`${name}/package.json`));

function getCustomWebpackConfig(dir, config) {
  const adminConfigPath = path.join(dir, 'admin', 'admin.config.js');

  let webpackConfig = getWebpackConfig(config);

  if (fs.existsSync(adminConfigPath)) {
    const adminConfig = require(path.resolve(adminConfigPath));

    if (_.isFunction(adminConfig.webpack)) {
      webpackConfig = adminConfig.webpack(webpackConfig, webpack);

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

async function build({ dir, env, options, optimize }) {
  // Create the cache dir containing the front-end files.
  await createCacheDir(dir);

  const cacheDir = path.resolve(dir, '.cache');
  const entry = path.resolve(cacheDir, 'admin', 'src');
  const dest = path.resolve(dir, 'build');

  // Roots for the @strapi/babel-plugin-switch-ee-ce
  const roots = {
    eeRoot: path.resolve(cacheDir, 'ee', 'admin'),
    ceRoot: path.resolve(cacheDir, 'admin', 'src'),
  };

  const config = getCustomWebpackConfig(dir, { entry, dest, env, options, optimize, roots });

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

async function createPluginsJs(plugins, localPlugins, dest) {
  const createPluginsArray = plugins =>
    plugins.map(name => {
      const shortName = _.camelCase(name.replace(/^@strapi\/plugin-/i, ''));

      return { name, shortName };
    });
  const appPluginsArray = createPluginsArray(plugins);
  const localPluginsArray = createPluginsArray(localPlugins);

  const content = `
${appPluginsArray
  .map(({ name, shortName }) => {
    const req = `'../../plugins/${name}/admin/src'`;

    return `import ${shortName} from ${req};`;
  })
  .join('\n')}
${localPluginsArray
  .map(({ name, shortName }) => {
    const req = `'../../../plugins/${name}/admin/src'`;

    return `import ${shortName} from ${req};`;
  })
  .join('\n')}

const plugins = {
${[...appPluginsArray, ...localPluginsArray]
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

async function copyPlugin(name, dest) {
  const pkgFilePath = getPkgPath(name);

  const resolveDepPath = (...args) => path.resolve(pkgFilePath, ...args);
  const resolveDest = (...args) => path.resolve(dest, 'plugins', name, ...args);

  const copy = (...args) => {
    return fs.copy(resolveDepPath(...args), resolveDest(...args));
  };

  // Copy the entire admin folder
  await copy('admin');
  await copy('package.json');
}

async function copyAdmin(dest) {
  const adminPath = getPkgPath('@strapi/admin');

  // TODO copy ee folders for plugins
  await fs.copy(path.resolve(adminPath, 'ee', 'admin'), path.resolve(dest, 'ee', 'admin'));

  await fs.ensureDir(path.resolve(dest, 'config'));
  await fs.copy(path.resolve(adminPath, 'admin'), path.resolve(dest, 'admin'));
  await fs.copy(
    path.resolve(adminPath, 'config', 'layout.js'),
    path.resolve(dest, 'config', 'layout.js')
  );

  // Copy package.json
  await fs.copy(path.resolve(adminPath, 'package.json'), path.resolve(dest, 'package.json'));
}

async function createCacheDir(dir) {
  const cacheDir = path.resolve(dir, '.cache');

  const pkgJSON = require(path.join(dir, 'package.json'));

  const pluginsToCopy = Object.keys(pkgJSON.dependencies).filter(
    dep =>
      dep.startsWith('@strapi/plugin') &&
      fs.existsSync(path.resolve(getPkgPath(dep), 'admin', 'src', 'index.js'))
  );

  let localPluginsToCopy = [];
  if (fs.existsSync(path.join(dir, 'plugins'))) {
    localPluginsToCopy = fs
      .readdirSync(path.join(dir, 'plugins'))
      .filter(plugin =>
        fs.existsSync(path.resolve(dir, 'plugins', plugin, 'admin', 'src', 'index.js'))
      );
  }

  // create .cache dir
  await fs.emptyDir(cacheDir);

  // copy admin core code
  await copyAdmin(cacheDir);

  // copy plugins code
  await Promise.all(pluginsToCopy.map(name => copyPlugin(name, cacheDir)));

  // Copy admin.config.js
  const customAdminConfigFilePath = path.join(dir, 'admin', 'admin.config.js');

  if (fs.existsSync(customAdminConfigFilePath)) {
    await fs.copy(
      customAdminConfigFilePath,
      path.resolve(cacheDir, 'admin', 'src', 'admin.config.js')
    );
  }

  // create plugins.js with plugins requires
  await createPluginsJs(pluginsToCopy, localPluginsToCopy, cacheDir);
}

async function watchAdmin({ dir, host, port, browser, options }) {
  // Create the cache dir containing the front-end files.
  await createCacheDir(dir);

  const entry = path.join(dir, '.cache', 'admin', 'src');
  const dest = path.join(dir, 'build');
  const env = 'development';

  const cacheDir = path.join(dir, '.cache');

  // Roots for the @strapi/babel-plugin-switch-ee-ce
  const roots = {
    eeRoot: path.resolve(cacheDir, 'ee', 'admin'),
    ceRoot: path.resolve(cacheDir, 'admin', 'src'),
  };

  const args = {
    entry,
    dest,
    env,
    port,
    options,
    roots,
  };

  const opts = {
    clientLogLevel: 'silent',
    quiet: true,
    open: browser === 'true' ? true : browser,
    publicPath: options.adminPath,
    historyApiFallback: {
      index: options.adminPath,
      disableDotRule: true,
    },
  };

  const webpackConfig = getCustomWebpackConfig(dir, args);
  const server = new WebpackDevServer(webpack(webpackConfig), opts);

  server.listen(port, host, function(err) {
    if (err) {
      console.log(err);
    }

    console.log(chalk.green('Starting the development server...'));
    console.log();
    console.log(chalk.green(`Admin development at http://${host}:${port}${opts.publicPath}`));
  });
}

module.exports = {
  clean,
  build,
  watchAdmin,
};
