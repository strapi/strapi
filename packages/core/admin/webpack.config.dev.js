'use strict';

const path = require('path');
const fs = require('fs-extra');

// eslint-disable-next-line node/no-extraneous-require
const glob = require('glob');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const { DuplicateReporterPlugin } = require('duplicate-dependencies-webpack-plugin');

const webpackConfig = require('./webpack.config');

const getPluginsPath = () => {
  const rootPath = path.join('..', '..', '..', 'packages');
  const corePath = path.join(rootPath, 'core', '*');
  const pluginsPath = path.join(rootPath, 'plugins', '*');
  const corePackageDirs = glob.sync(corePath);
  const pluginsPackageDirs = glob.sync(pluginsPath);
  const packageDirs = [...corePackageDirs, ...pluginsPackageDirs].filter(dir => {
    const isCoreAdmin = dir.includes('packages/core/admin/');
    const pathToEntryPoint = path.join(dir, 'admin', 'src', 'index.js');
    const doesAdminFolderExist = fs.pathExistsSync(pathToEntryPoint);

    return !isCoreAdmin && doesAdminFolderExist;
  });

  return packageDirs.map(dir => path.resolve(__dirname, path.join(dir, 'admin', 'src')));
};

module.exports = () => {
  const analyzeBundle = process.env.ANALYZE_BUNDLE;
  const analyzeDuplicateDependencies = process.env.ANALYZE_DEPS;
  // Directly inject a polyfill in the webpack entry point before the entry point
  // FIXME: I have noticed a bug regarding the helper-plugin and esbuild-loader
  // The only I could fix it was to inject the babel polyfill
  const babelPolyfill = '@babel/polyfill/dist/polyfill.min.js';
  const entry = [babelPolyfill, path.join(__dirname, 'admin', 'src')];
  const dest = path.join(__dirname, 'build');

  // When running the analyze:bundle command, it needs a production build
  // to display the tree map of modules
  const env = analyzeBundle ? 'production' : 'development';
  const options = {
    backend: 'http://localhost:1337',
    adminPath: '/admin/',
  };

  const args = {
    entry,
    cacheDir: __dirname,
    pluginsPath: getPluginsPath(),
    dest,
    env,
    options,
  };

  const config = webpackConfig(args);

  if (analyzeBundle) {
    config.plugins.push(new BundleAnalyzerPlugin());
  }

  if (analyzeDuplicateDependencies === 'true') {
    config.plugins.push(new DuplicateReporterPlugin());
  }

  return {
    ...config,

    devServer: {
      port: 4000,
      client: {
        logging: 'none',
        overlay: {
          errors: true,
          warnings: false,
        },
      },
      historyApiFallback: {
        index: '/admin/',
        disableDotRule: true,
      },
    },
  };
};
