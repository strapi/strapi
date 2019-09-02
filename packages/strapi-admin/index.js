const path = require('path');
const fs = require('fs-extra');
const webpack = require('webpack');
const getWebpackConfig = require('./webpack.config.js');

const getPkgPath = name =>
  path.dirname(require.resolve(`${name}/package.json`));

async function createPluginsJs(plugins, dest) {
  const content = `
    const injectReducer = require('./utils/injectReducer').default;
    const injectSaga = require('./utils/injectSaga').default;
    const { languages } = require('./i18n');

    window.strapi = Object.assign(window.strapi || {}, {
      node: MODE || 'host',
      backendURL: BACKEND_URL === '/' ? window.location.origin : BACKEND_URL,
      languages,
      currentLanguage:
      window.localStorage.getItem('strapi-admin-language') ||
      window.navigator.language ||
      window.navigator.userLanguage ||
      'en',
      injectReducer,
      injectSaga,
    });

    module.exports = {
      ${plugins
        .map(name => {
          const shortName = name.replace(/^strapi-plugin-/i, '');
          const req = `require('../../plugins/${name}/admin/src').default`;
          return `'${shortName}': ${req}`;
        })
        .join(',\n')}
    }
  `;

  return fs.writeFile(
    path.resolve(dest, 'admin', 'src', 'plugins.js'),
    content
  );
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

  // Copy the layout.js if it exists
  if (await fs.exists(path.resolve(pkgFilePath, 'config', 'layout.js'))) {
    await fs.ensureDir(resolveDest('config'));
    await copy('config', 'layout.js');
  }

  await copy('package.json');
}

async function copyAdmin(dest) {
  const adminPath = getPkgPath('strapi-admin');

  await fs.ensureDir(path.resolve(dest, 'config'));
  await fs.copy(path.resolve(adminPath, 'admin'), path.resolve(dest, 'admin'));
  await fs.copy(
    path.resolve(adminPath, 'config', 'layout.js'),
    path.resolve(dest, 'config', 'layout.js')
  );
}

async function copyCustomAdmin(src, dest) {
  await fs.copy(src, path.resolve(dest, 'admin'));
}

async function build({ dir, env, options }) {
  const cacheDir = path.resolve(dir, '.cache');

  const pkgJSON = require(path.join(dir, 'package.json'));

  const pluginsToCopy = Object.keys(pkgJSON.dependencies).filter(
    dep =>
      dep.startsWith('strapi-plugin') &&
      fs.existsSync(path.resolve(getPkgPath(dep), 'admin', 'src', 'index.js'))
  );

  // TODO: add logic to avoid copying files if not necessary

  // create .cache dir
  await fs.emptyDir(cacheDir);

  // copy admin core code
  await copyAdmin(cacheDir);

  // copy plugins code
  await Promise.all(pluginsToCopy.map(name => copyPlugin(name, cacheDir)));

  // create plugins.js with plugins requires
  await createPluginsJs(pluginsToCopy, cacheDir);

  // override admin code with user customizations
  if (fs.pathExistsSync(path.join(dir, 'admin'))) {
    await copyCustomAdmin(path.join(dir, 'admin'), cacheDir);
  }

  const entry = path.resolve(cacheDir, 'admin', 'src', 'app.js');
  const dest = path.resolve(dir, 'build');

  const config = getWebpackConfig({ entry, dest, env, options });

  const compiler = webpack(config);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      let messages;
      if (err) {
        if (!err.message) {
          return reject(err);
        }
        messages = {
          errors: [err.message],
          warnings: [],
        };
      } else {
        messages = stats.toJson({ all: false, warnings: true, errors: true });
      }

      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }
        return reject(new Error(messages.errors.join('\n\n')));
      }

      return resolve({
        stats,
        warnings: messages.warnings,
      });
    });
  });
}

module.exports = {
  build,
  createPluginsJs,
};
