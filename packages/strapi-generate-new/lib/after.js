'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

const { green, cyan } = require('chalk');
const fs = require('fs-extra');
const ora = require('ora');
const shell = require('shelljs');

// Logger.
const { packageManager } = require('strapi-utils');
const trackSuccess = require('./success');

const runInstall = () => {
  if (packageManager.isStrapiInstalledWithNPM()) {
    return new Promise((resolve, reject) => {
      shell.exec(
        'npm install --production --no-optional',
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
      'yarn install --production --no-optional',
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

  let loader = ora('Copying files').start();

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

  console.log(
    `\n👌 Your application was created at ${cyan(scope.rootPath)}.\n`
  );

  trackSuccess('didCreateProject', scope);

  loader.start('Building the admin UI');

  shell.exec('npm run build');

  loader.succeed();

  if (scope.quick) {
    console.log('⚡️ Starting your application...');
  } else {
    console.log('⚡️ Change directory:');
    console.log(`$ ${green(`cd ${scope.name}`)}`);
    console.log();
    console.log('⚡️ Start your application:');
    console.log(`$ ${green('strapi start')}`);
  }

  cb();
};
