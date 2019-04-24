const path = require('path');
const fs = require('fs-extra');

const appPath = process.cwd();
const pkgPath = pkg => path.dirname(require.resolve(`${pkg}/package.json`));
const cacheDir = path.resolve(appPath, '.cache');
const pkgJSON = require(path.join(appPath, 'package.json'));

fs.copySync(
  path.resolve(pkgPath('strapi-admin'), 'admin'),
  path.resolve(cacheDir, 'admin'),
);
fs.ensureDirSync(path.resolve(cacheDir, 'config'));
fs.copySync(
  path.resolve(pkgPath('strapi-admin'), 'config', 'layout.js'),
  path.resolve(cacheDir, 'config', 'layout.js'),
);

const strapiDeps = Object.keys(pkgJSON.dependencies).filter(
  dep =>
    dep.startsWith('strapi-plugin') &&
    fs.existsSync(path.resolve(pkgPath(dep), 'admin', 'src', 'index.js')),
);

strapiDeps.forEach(dep => {
  const pkgFilePath = pkgPath(dep);
  const resolveDepPath = (...args) => path.resolve(pkgFilePath, ...args);
  const resolveCachDir = (...args) =>
    path.resolve(cacheDir, 'plugins', dep, ...args);
  const copy = (...args) => {
    fs.copySync(resolveDepPath(...args), resolveCachDir(...args));
  };

  // Copy the entire admin folder
  copy('admin');

  // Copy the layout.js if it exists
  if (fs.existsSync(path.resolve(pkgFilePath, 'config', 'layout.js'))) {
    fs.ensureDirSync(resolveCachDir('config'));
    copy('config', 'layout.js');
  }

  copy('package.json');
});

fs.writeFileSync(
  path.resolve(cacheDir, 'admin', 'src', 'plugins.js'),
  `
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
${strapiDeps
    .map(p => `'${p}': require('../../plugins/${p}/admin/src').default`)
    .join(',\n')}
}\n
    `,
  'utf8',
);

// const c = strapiDeps.reduce((acc, current) => {
//   acc[current] = `require('../../plugins/${current}/admin/src').default`;

//   return acc;
// }, {});
// console.log(c);

// fs.writeFileSync(
//   path.resolve(cacheDir, 'admin', 'src', 'plugins.js'),
//   c,
//   'utf8',
// );
