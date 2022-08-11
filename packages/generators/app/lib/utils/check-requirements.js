'use strict';

module.exports = function checkBeforeInstall() {
  const currentNodeVersion = process.versions.node;
  const semver = currentNodeVersion.split('.');
  const major = semver[0];

  if (major < 12) {
    console.error(`You are running Node ${currentNodeVersion}`);
    console.error('Strapi requires Node 12 and higher.');
    console.error('Please make sure to use the right version of Node.');
    process.exit(1);
  }
};
