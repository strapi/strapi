'use strict';

const execa = require('execa');

module.exports = function hasYarn() {
  try {
    const { exitCode } = execa.sync('yarn --version', { shell: true });

    if (exitCode === 0) return true;
    return false;
  } catch (err) {
    return false;
  }
};
