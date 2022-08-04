'use strict';

const { red, green, bold } = require('chalk');
const semver = require('semver');

module.exports = function checkBeforeInstall() {
  const currentNodeVersion = process.versions.node;
  const minNodeVersion = '14.19.1'; // greater than or equal to this
  const maxNodeVersion = '17.0.0'; // less than this

  if (
    !semver.gte(currentNodeVersion, minNodeVersion) ||
    !semver.lt(currentNodeVersion, maxNodeVersion)
  ) {
    console.error(red(`You are running ${bold(`node ${currentNodeVersion}`)}`));
    console.error(
      `Strapi requires ${bold(green(`node >=${minNodeVersion} and <${maxNodeVersion}`))}`
    );
    console.error('Please make sure to use the right version of Node.');
  }

  // only exit on lower version; higher version is allowed to proceed with only the warning
  if (!semver.gte(currentNodeVersion, minNodeVersion)) {
    process.exit(1);
  }
};
