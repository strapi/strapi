'use strict';

const path = require('path');
const webpack = require('webpack');
const { isObject } = require('lodash');
// eslint-disable-next-line node/no-extraneous-require
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');

const webpackConfig = require('../webpack.config');
const getPluginsPath = require('../utils/get-plugins-path');
const {
  getCorePluginsPath,
  getPluginToInstallPath,
  createPluginsFile,
} = require('./create-plugins-file');

const PLUGINS_TO_INSTALL = ['i18n', 'users-permissions'];

// Wrapper that outputs the webpack speed
const smp = new SpeedMeasurePlugin();

const buildAdmin = async () => {
  const entry = path.join(__dirname, '..', 'admin', 'src');
  const dest = path.join(__dirname, '..', 'build');
  const tsConfigFilePath = path.join(__dirname, '..', 'admin', 'src', 'tsconfig.json');

  const corePlugins = getCorePluginsPath();
  const plugins = getPluginToInstallPath(PLUGINS_TO_INSTALL);
  const allPlugins = { ...corePlugins, ...plugins };
  const pluginsPath = getPluginsPath();

  await createPluginsFile(allPlugins);

  const args = {
    entry,
    dest,
    cacheDir: path.join(__dirname, '..'),
    pluginsPath,
    env: 'production',
    optimize: true,
    options: {
      backend: 'http://localhost:1337',
      adminPath: '/admin/',
    },
    tsConfigFilePath,
  };

  const config =
    process.env.MEASURE_BUILD_SPEED === 'true'
      ? smp.wrap(webpackConfig(args))
      : webpackConfig(args);

  const compiler = webpack(config);

  console.log('Building the admin panel');

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
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
