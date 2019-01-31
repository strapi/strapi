/* eslint-disable */
const shell = require('shelljs');
shell.exec('npm -v', {silent: true}, function (code, stdout, stderr) {
  if (code) throw stderr;
  if (parseFloat(stdout) < 3) {
    throw new Error('[ERROR: Strapi plugin] You need npm version @>=3');
    process.exit(1);
  }
});
