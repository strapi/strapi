'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const { execSync } = require('child_process');

// Public node modules.
const _ = require('lodash');
const fs = require('fs-extra');
const npm = require('enpeem');
const shell = require('shelljs');

// Logger.
const { logger, packageManager } = require('strapi-utils');

/**
 * Runs after this generator has finished
 *
 * @param {Object} scope
 * @param {Function} cb
 */

/* eslint-disable no-console */
/* eslint-disable prefer-template */
module.exports = (scope, cb) => {
  const packageJSON = require(path.resolve(scope.rootPath, 'package.json'));
  // const strapiRootPath = path.resolve(scope.strapiRoot, '..');

  process.chdir(scope.rootPath);

  // Copy the default files.
  fs.copySync(path.resolve(__dirname, '..', 'files'), path.resolve(scope.rootPath));

  const availableDependencies = [];
  const dependencies = _.get(packageJSON, 'dependencies');
  const strapiDependencies = Object.keys(dependencies).filter(key => key.indexOf('strapi') !== -1);
  const othersDependencies = Object.keys(dependencies).filter(key => key.indexOf('strapi') === -1);
  // Add this check to know if we are in development mode so the creation is faster.
  const isStrapiInstalledWithNPM = packageManager.isStrapiInstalledWithNPM();
  const globalRootPath = isStrapiInstalledWithNPM ? execSync('npm root -g') : execSync(packageManager.commands('root -g'));
  // const globalRootPath = execSync('npm root -g');

  // Verify if the dependencies are available into the global
  _.forEach(strapiDependencies, (key) => {
    try {
      const depPath = isStrapiInstalledWithNPM ? path.resolve(_.trim(globalRootPath.toString()), key) : path.resolve(_.trim(globalRootPath.toString()), `node_modules/${key}`);
      fs.accessSync(depPath, fs.constants.R_OK | fs.constants.F_OK);

      availableDependencies.push({
        key,
        global: true,
        // path: path.resolve(_.trim(globalRootPath.toString()), key)
        path: depPath
      });
    } catch (e) {
      othersDependencies.push(key);
    }
  });

  logger.info('Installing dependencies...');
  if (!_.isEmpty(othersDependencies)) {
    if (isStrapiInstalledWithNPM) {
      npm.install({
        dir: scope.rootPath,
        dependencies: othersDependencies,
        loglevel: 'silent',
        production: true,
        'cache-min': 999999999
      }, err => {
        if (err) {
          console.log();
          logger.warn('You should run `npm install` into your application before starting it.');
          console.log();
          logger.warn('Some dependencies could not be installed:');
          _.forEach(othersDependencies, value => logger.warn('• ' + value));
          console.log();

          return cb();
        }

        pluginsInstallation();
      });
    } else {
      const alphaDependencies = othersDependencies.map(dep => {
        if (_.includes(dep, 'strapi') && !_.includes(dep, '@alpha')) { // We need this for yarn
          return `${dep}@alpha`;
        }

        return dep;
      }).join(' ');
      const data = shell.exec(`yarn --cwd ${scope.rootPath} add ${alphaDependencies} --production`, { silent: true });

      if (data.stderr && data.code !== 0) {
        cb();
      }
      pluginsInstallation();
    }
  } else {
    pluginsInstallation();
  }


  // Install default plugins and link dependencies.
  function pluginsInstallation() {
    const strapiBin = path.join(scope.strapiRoot, scope.strapiPackageJSON.bin.strapi);
    // Define the list of default plugins.
    const defaultPlugins = [{
      name: 'settings-manager',
      core: true
    }, {
      name: 'content-type-builder',
      core: true
    }, {
      name: 'content-manager',
      core: true
    }, {
      name: 'users-permissions',
      core: true
    }, {
      name: 'email',
      core: true
    },{
      name: 'upload',
      core: true
    }];

    // Install each plugin.
    defaultPlugins.forEach(defaultPlugin => {
      try {
        execSync(`node ${strapiBin} install ${defaultPlugin.name} ${scope.developerMode && defaultPlugin.core ? '--dev' : ''}`);
        logger.info(`The plugin ${defaultPlugin.name} has been successfully installed.`);
      } catch (error) {
        logger.error(`An error occurred during ${defaultPlugin.name} plugin installation.`);
        logger.error(error);
      }
    });

    // Link dependencies.
    availableDependencies.forEach(dependency => {
      logger.info(`Linking \`${dependency.key}\` dependency to the project...`);

      if (dependency.global) {
        try {
          fs.accessSync(dependency.path, fs.constants.R_OK | fs.constants.F_OK);
          fs.symlinkSync(dependency.path, path.resolve(scope.rootPath, 'node_modules', dependency.key), 'dir');
        } catch (e) {
          // Silent.
        }
      } else {
        try {
          fs.accessSync(path.resolve(scope.strapiRoot, 'node_modules', dependency.key), fs.constants.R_OK | fs.constants.F_OK);
          fs.symlinkSync(path.resolve(scope.strapiRoot, 'node_modules', dependency.key), path.resolve(scope.rootPath, 'node_modules', dependency.key), 'dir');
        } catch (e) {
          // Silent.
        }
      }
    });

    logger.info('Your new application `' + scope.name + '` is ready at `' + scope.rootPath + '`.');

    logger.info('We are almost there !!!');
    logger.info('cd ' + scope.name);
    logger.info('strapi start');
    logger.info('Open your browser to http://localhost:1337');
    logger.info('Enjoy your strapi project :)');

    cb();
  }
};
