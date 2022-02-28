'use strict';

const execa = require('execa');

module.exports = function hasYarn() {
  try {
    const { code } = execa.shellSync('yarnpkg --version');
    if (code === 0) return true;
    return false;
  } catch (err) {
    return false;
  }
};
