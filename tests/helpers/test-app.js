'use strict';

const path = require('path');
const fs = require('fs');
const { rimraf } = require('rimraf');
const execa = require('execa');
const { createStrapi } = require('create-strapi-app');

/**
 * Deletes a test app
 * @param {string} appPath - name of the app / folder where the app is located
 */
const cleanTestApp = async (appPath) => {
  await rimraf(path.resolve(appPath));
};

/**
 * Runs strapi generate new
 * @param {Object} options - Options
 * @param {string} options.appPath - Name of the app that will be created (also the name of the folder)
 * @param {database} options.database - Arguments to create the testApp with the provided database params
 */
const generateTestApp = async ({ appPath, database, template, link = false }) => {
  const pkg = require(path.resolve(__dirname, '../../packages/core/strapi/package.json'));

  const scope = {
    database,
    rootPath: path.resolve(appPath),
    name: path.basename(appPath),
    packageManager: 'yarn',
    // disable quickstart run app after creation
    runApp: false,
    // use package version as strapiVersion (all packages have the same version);
    strapiVersion: pkg.version,
    isQuickstart: false,
    uuid: undefined,
    deviceId: null,
    installDependencies: false,
    dependencies: {
      '@strapi/strapi': pkg.version,
      '@strapi/plugin-users-permissions': pkg.version,
      '@strapi/plugin-graphql': pkg.version,
      '@strapi/plugin-documentation': pkg.version,
      '@strapi/plugin-cloud': pkg.version,
      react: '18.2.0',
      'react-dom': '18.2.0',
      'react-router-dom': '^6.0.0',
      'styled-components': '^6.0.0',
    },
    template: template ? path.resolve(template) : template,
    gitInit: false,
  };

  await createStrapi(scope);

  if (link) {
    await linkPackages(scope);
  }
};

const linkPackages = async (scope) => {
  fs.writeFileSync(path.join(scope.rootPath, 'yarn.lock'), '');

  await execa('node', [path.join(__dirname, '../..', 'scripts', 'yalc-link.js')], {
    cwd: scope.rootPath,
    stdio: 'inherit',
  });
};

/**
 * Runs a test app
 * @param {string} appPath - name of the app / folder where the app is located
 */
const runTestApp = async (appPath) => {
  const cmdContext = {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../..', appPath),
    env: {
      // if STRAPI_LICENSE is in the env the test will run in ee automatically
      STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
      FORCE_COLOR: 1,
      JWT_SECRET: 'aSecret',
    },
  };

  try {
    await execa('yarn', ['strapi', 'build'], cmdContext);
    await execa('yarn', ['strapi', 'start'], cmdContext);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = {
  cleanTestApp,
  generateTestApp,
  runTestApp,
};
