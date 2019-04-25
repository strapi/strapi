const path = require('path');
const webpack = require('webpack');
const fs = require('fs-extra');
const getPkgPath = require('../lib/load/package-path');

function createPluginsJs(plugins, dest) {
  const content = `
    const injectReducer = require('./utils/injectReducer').default;
    const injectSaga = require('./utils/injectSaga').default;
    const { languages } = require('./i18n');

    window.strapi = Object.assign(window.strapi || {}, {
      node: MODE || 'host',
      backendURL: BACKEND_URL,
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

  fs.writeFileSync(path.resolve(dest, 'admin', 'src', 'plugins.js'), content);
}

async function copyPlugin(name, dest) {
  const pkgFilePath = getPkgPath(name);

  const resolveDepPath = (...args) => path.resolve(pkgFilePath, ...args);
  const resolveDest = (...args) => path.resolve(dest, 'plugins', name, ...args);

  const copy = (...args) => {
    fs.copySync(resolveDepPath(...args), resolveDest(...args));
  };

  // Copy the entire admin folder
  copy('admin');

  // Copy the layout.js if it exists
  if (fs.existsSync(path.resolve(pkgFilePath, 'config', 'layout.js'))) {
    fs.ensureDirSync(resolveDest('config'));
    copy('config', 'layout.js');
  }

  copy('package.json');
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

module.exports = async () => {
  console.log('Building your app');
  const dir = process.cwd();
  const cacheDir = path.resolve(dir, '.cache');

  const pkgJSON = require(path.join(dir, 'package.json'));

  // create .cache dir
  await fs.ensureDir(cacheDir);

  await copyAdmin(cacheDir);

  const pluginsToCopy = Object.keys(pkgJSON.dependencies).filter(
    dep =>
      dep.startsWith('strapi-plugin') &&
      fs.existsSync(path.resolve(getPkgPath(dep), 'admin', 'src', 'index.js'))
  );

  pluginsToCopy.forEach(name => copyPlugin(name, cacheDir));

  createPluginsJs(pluginsToCopy, cacheDir);

  const config = require(path.resolve(
    getPkgPath('strapi-admin'),
    'webpack.config.js'
  ))({
    entry: path.resolve(cacheDir, 'admin', 'src', 'app.js'),
    dest: path.resolve(dir, 'build'),
  });

  webpack(config, (err, stats) => {
    // Stats Object
    if (err || stats.hasErrors()) {
      // Handle errors here
    }
    // Done processing
  });
};
