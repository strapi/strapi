'use strict';

const _ = require('lodash');
const minimatch = require('minimatch');

const envMatcher = new minimatch.Minimatch(
  'config/environments/*/+(request|database|server|security|response).+(json|js)'
);

// files to load with filename key
const prefixedPaths = [
  'functions',
  'policies',
  'locales',
  'hook',
  'middleware',
  'language',
  'queries',
  'layout',
];

module.exports = function checkReservedFilenames(file) {
  if (envMatcher.match(file)) return true;
  return _.some(prefixedPaths, e => file.indexOf(`config/${e}`) >= 0)
    ? true
    : false;
};
