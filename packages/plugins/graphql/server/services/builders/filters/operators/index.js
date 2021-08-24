'use strict';

const { mapValues } = require('lodash/fp');

const and = require('./and');
const or = require('./or');
const not = require('./not');
const eq = require('./eq');
const startsWith = require('./starts-with');
const endsWith = require('./ends-with');
const contains = require('./contains');
const gt = require('./gt');
const lt = require('./lt');

const operators = {
  and,
  or,
  not,
  eq,
  startsWith,
  endsWith,
  contains,
  gt,
  lt,
};

// Instantiate every operator with the Strapi instance
module.exports = context => mapValues(opCtor => opCtor(context), operators);
