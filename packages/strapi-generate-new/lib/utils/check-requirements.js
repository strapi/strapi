module.exports = function checkBeforeInstall() {
  let currentNodeVersion = process.versions.node;
  let semver = currentNodeVersion.split('.');
  let major = semver[0];

  if (major < 10) {
    console.error(`You are running Node ${currentNodeVersion}`);
    console.error('Strapi requires Node 10 and higher.');
    console.error('Please make sure to use the right version of Node.');
    process.exit(1);
  }
};
