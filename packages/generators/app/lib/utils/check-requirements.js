'use strict';

const { red, green, bold, yellow } = require('chalk');
const semver = require('semver');
const packageJSON = require('../resources/json/common/package.json');

module.exports = function checkBeforeInstall() {
  const currentNodeVersion = process.versions.node;
  const { engines } = packageJSON({ strapiDependencies: [] });

  // error if the node version isn't supported
  if (!semver.satisfies(currentNodeVersion, engines.node)) {
    console.error(red(`You are running ${bold(`Node.js ${currentNodeVersion}`)}`));
    console.error(`Strapi requires ${bold(green(`Node.js ${engines.node}`))}`);
    console.error('Please make sure to use the right version of Node.');
    process.exit(1);
  }

  // warn if not using a LTS version
  else if (!semver.satisfies(currentNodeVersion, '14.x.x || 16.x.x || 18.x.x || 20.x.x')) {
    console.warn(yellow(`You are running ${bold(`Node.js ${currentNodeVersion}`)}`));
    console.warn(
      `Strapi only supports ${bold(
        green('LTS versions of Node.js')
      )}, other versions may not be compatible.`
    );
  }
};
