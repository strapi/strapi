'use strict';

const compile = require('./compile');
const compilers = require('./compilers');
const admin = require('./admin');
const utils = require('./utils');
const generators = require('./generators');
const typecheck = require('./typecheck');

module.exports = {
  compile,
  compilers,
  admin,
  generators,
  typecheck,

  ...utils,
};
