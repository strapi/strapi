'use strict';

// Dependencies.
const fs = require('fs-extra');
const path = require('path');
const slash = require('slash');
// const glob = require('glob');
// const { parallel } = require('async');
const _ = require('lodash');
const glob = require('../load/glob');
const findPackagePath = require('../load/package-path');

module.exports = async function({ installedHooks, installedPlugins, appPath }) {
  let hooks = {};

  await Promise.all([
    loadHookDependencies(installedHooks, hooks),
    // local middleware
    loadHooksInDir(path.resolve(appPath, 'hooks'), hooks),
    // plugins middlewares
    loadPluginsHooks(installedPlugins, hooks),
    // local plugin middlewares
    loadLocalPluginsHooks(appPath, hooks),
  ]);

  return hooks;
};

const loadHooksInDir = async (dir, hooks) => {
  const files = await glob('*/*(index|defaults).*(js|json)', {
    cwd: dir,
  });

  files.forEach(f => {
    const name = slash(f).split('/')[0];
    mountHooks(name, [path.resolve(dir, f)], hooks);
  });
};

const loadPluginsHooks = async (plugins, hooks) => {
  for (let pluginName of plugins) {
    const dir = path.resolve(findPackagePath(pluginName), 'hooks');
    await loadHooksInDir(dir, hooks);
  }
};

const loadLocalPluginsHooks = async (appPath, hooks) => {
  const pluginsFolder = path.resolve(appPath, 'plugins');
  const pluginsFolders = await fs.readdir(pluginsFolder);

  for (let pluginFolder of pluginsFolders) {
    const dir = path.resolve(pluginsFolder, pluginFolder, 'hooks');
    await loadHooksInDir(dir, hooks);
  }
};

const loadHookDependencies = async (installedHooks, hooks) => {
  for (let hook of installedHooks) {
    const hookDir = path.dirname(require.resolve(hook));

    const files = await glob('*(index|defaults).*(js|json)', {
      cwd: hookDir,
      absolute: true,
    });

    mountHooks(hook.substring('strapi-hook-'.length), files, hooks);
  }
};

const mountHooks = (name, files, hooks) => {
  files.forEach(file => {
    hooks[name] = hooks[name] || { loaded: false };

    let dependencies = [];
    try {
      dependencies = _.get(
        require(`strapi-hook-${name}/package.json`),
        'strapi.dependencies',
        []
      );
    } catch (err) {
      // Silent
    }

    if (_.endsWith(file, 'index.js') && !hooks[name].load) {
      Object.defineProperty(hooks[name], 'load', {
        configurable: false,
        enumerable: true,
        get: () => require(file),
      });
      hooks[name].dependencies = dependencies;
      return;
    }

    if (_.endsWith(file, 'defaults.json')) {
      hooks[name].defaults = require(file);
      return;
    }
  });
};

// const mountHooks = function(files, cwd, source) {
//   return (resolve, reject) =>
//     parallel(
//       files.map(p => cb => {
//         const folders = p
//           .replace(/^.\/node_modules\/strapi-hook-/, './')
//           .split('/');
//         const name =
//           source === 'plugins' ? folders[folders.length - 2] : folders[1];

//         this.hook[name] = this.hook[name] || {
//           loaded: false,
//         };

//         let dependencies = [];
//         if (source === 'node_modules') {
//           try {
//             dependencies = get(
//               require(path.resolve(
//                 this.config.appPath,
//                 'node_modules',
//                 `strapi-hook-${name}`,
//                 'package.json'
//               )),
//               'strapi.dependencies',
//               []
//             );
//           } catch (err) {
//             // Silent
//           }
//         }

//         if (endsWith(p, 'index.js') && !this.hook[name].load) {
//           // Lazy loading.
//           Object.defineProperty(this.hook[name], 'load', {
//             configurable: false,
//             enumerable: true,
//             get: () => require(path.resolve(cwd, p)),
//             dependencies,
//           });

//           this.hook[name].dependencies = dependencies;
//         } else if (endsWith(p, 'defaults.json')) {
//           this.hook[name].defaults = require(path.resolve(cwd, p));
//         }

//         cb();
//       }),
//       err => {
//         if (err) {
//           return reject(err);
//         }

//         resolve();
//       }
//     );
// };
