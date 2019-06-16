'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

const { green, cyan } = require('chalk');
const fs = require('fs-extra');
const ora = require('ora');
const execa = require('execa');

// Logger.
const trackSuccess = require('./success');

const installArguments = ['install', '--production', '--no-optional'];
const runInstall = ({ rootPath, hasYarn }) => {
  if (hasYarn) {
    return execa('yarnpkg', installArguments, { cwd: rootPath });
  }
  return execa('npm', installArguments, { cwd: rootPath });
};

module.exports = async (scope, cb) => {
  console.log('🏗  Application generation:');

  let loader = ora('Copying files ...').start();

  // Copy the default files.
  fs.copySync(
    path.resolve(__dirname, '..', 'files'),
    path.resolve(scope.rootPath)
  );

  loader.succeed();

  loader.start('Installing dependencies ...');

  try {
    await runInstall(scope);
    loader.succeed();
  } catch (err) {
    loader.fail();
    trackSuccess('didNotInstallProjectDependencies', scope);
    cb(err);
  }

  trackSuccess('didCreateProject', scope);

  console.log();
  console.log(`👌 Your application was created at ${cyan(scope.rootPath)}.\n`);

  if (scope.quick) {
    console.log('⚡️ Starting your application...');
  } else {
    console.log('⚡️ Change directory:');
    console.log(`$ ${green(`cd ${scope.name}`)}`);
    console.log();
    console.log('⚡️ Start your application:');
    console.log(`$ ${green('strapi develop')}`);
  }

  cb();
};
