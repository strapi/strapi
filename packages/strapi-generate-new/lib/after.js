'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public node modules.
const _ = require('lodash');
const { green, cyan } = require('chalk');
const fs = require('fs-extra');
const npm = require('enpeem');
const ora = require('ora');
const shell = require('shelljs');

// Logger.
const { packageManager } = require('strapi-utils');
const trackSuccess = require('./success');

const runInstall = () => {
  if (packageManager.isStrapiInstalledWithNPM()) {
    return new Promise((resolve, reject) => {
      shell.exec(
        'npm install --production',
        { silent: true },
        (code, _, stderr) => {
          if (stderr && code !== 0) return reject(new Error(stderr));
          return resolve();
        }
      );
    });
  }

  return new Promise((resolve, reject) => {
    shell.exec(
      'yarn install --production',
      { silent: true },
      (code, _, stderr) => {
        if (stderr && code !== 0) return reject(new Error(stderr));
        return resolve();
      }
    );
  });
};

module.exports = async (scope, cb) => {
  console.log('🏗  Application generation:');

  let loader = ora('Copy dashboard').start();

  // const packageJSON = require(path.resolve(scope.rootPath, 'package.json'));
  // const strapiRootPath = path.resolve(scope.strapiRoot, '..');

  process.chdir(scope.rootPath);

  // Copy the default files.
  fs.copySync(
    path.resolve(__dirname, '..', 'files'),
    path.resolve(scope.rootPath)
  );

  loader.succeed();

  loader.start('Installing dependencies');

  try {
    await runInstall();
    loader.succeed();
  } catch (err) {
    loader.fail();
    trackSuccess('didNotInstallProjectDependencies', scope);
    cb(err);
  }

  console.log();
  console.log(
    `👌 Your new application ${green(scope.name)} is ready at ${cyan(
      scope.rootPath
    )}.`
  );

  trackSuccess('didCreateProject', scope);

  if (scope.quick) {
    console.log();
    console.log('⚡️ Starting your application:');
    console.log(`${green('strapi start')}`);
  } else {
    console.log();
    console.log('⚡️ Change directory:');
    console.log(`$ ${green(`cd ${scope.name}`)}`);
    console.log();
    console.log('⚡️ Start application:');
    console.log(`$ ${green('strapi start')}`);
  }

  cb();
  // });
  // }
};
