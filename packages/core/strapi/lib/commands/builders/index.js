'use strict';

const buildAdmin = require('./admin');
const buildTypeScript = require('./typescript');
const typecheck = require('./typecheck');

module.exports = {
  buildAdmin,
  buildTypeScript,
  typecheck,
};
