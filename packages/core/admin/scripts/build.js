'use strict';

const path = require('path');
const webpack = require('webpack');
const { isObject } = require('lodash');
const webpackConfig = require('../webpack.config');
const {
  getCorePluginsPath,
  getPluginToInstallPath,
  createPluginsFile,
} = require('./create-plugins-file');

const PLUGINS_TO_INSTALL = ['i18n', 'users-permissions'];

const buildAdmin = async () => {
  const entry = path.join(__dirname, '..', 'admin', 'src');
  const dest = path.join(__dirname, '..', 'build');
  const corePlugins = getCorePluginsPath();
  const plugins = getPluginToInstallPath(PLUGINS_TO_INSTALL);
  const allPlugins = { ...corePlugins, ...plugins };

  await createPluginsFile(allPlugins);

  const args = {
    entry,
    dest,
    cacheDir: path.resolve(__dirname, '..'),
    pluginsPath: [path.resolve(__dirname, '../../../../packages')],
    env: 'production',
    optimize: true,
    options: {
      backend: 'http://localhost:1337',
      adminPath: '/admin/',
    },
  };

  const compiler = webpack(webpackConfig(args));

  console.log('Building the admin panel');

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      console.log(err);
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

        return reject(
          new Error(
            messages.errors.reduce((acc, error) => {
              if (isObject(error)) {
                acc += error.message;
              } else {
                acc += error.join('\n\n');
              }

              return acc;
            }, '')
          )
        );
      }

      return resolve({
        stats,
        warnings: messages.warnings,
      });
    });
  });
};

buildAdmin()
  .then(() => {
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
