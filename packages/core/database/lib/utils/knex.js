'use strict';

const KnexBuilder = require('knex/lib/query/querybuilder');
const KnexRaw = require('knex/lib/raw');

const isKnexQuery = (value) => {
  return value instanceof KnexBuilder || value instanceof KnexRaw;
};

module.exports = {
  isKnexQuery,
};
