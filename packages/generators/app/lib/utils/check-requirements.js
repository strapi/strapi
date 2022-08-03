'use strict';

const { red, green, bold } = require('chalk');

module.exports = function checkBeforeInstall() {
  const currentNodeVersion = process.versions.node;
  const semver = currentNodeVersion.split('.');
  const major = semver[0];

  if (major < 14 || major > 16) {
    console.error(red(`You are running ${bold(`Node ${currentNodeVersion}`)}`));
    console.error(`Strapi requires ${bold(green('Node 14 or 16'))}`);
    console.error('Please make sure to use the right version of Node.');
    process.exit(1);
  }
};
