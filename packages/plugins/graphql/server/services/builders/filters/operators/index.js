'use strict';

const { mapValues } = require('lodash/fp');

const operators = {
  and: require('./and'),
  or: require('./or'),
  not: require('./not'),

  eq: require('./eq'),
  eqi: require('./eqi'),
  ne: require('./ne'),

  startsWith: require('./starts-with'),
  endsWith: require('./ends-with'),

  contains: require('./contains'),
  notContains: require('./not-contains'),

  containsi: require('./containsi'),
  notContainsi: require('./not-containsi'),

  gt: require('./gt'),
  gte: require('./gte'),

  lt: require('./lt'),
  lte: require('./lte'),

  null: require('./null'),
  notNull: require('./not-null'),

  in: require('./in'),
  notIn: require('./not-in'),

  between: require('./between'),
};

// Instantiate every operator with the Strapi instance
module.exports = context => mapValues(opCtor => opCtor(context), operators);
