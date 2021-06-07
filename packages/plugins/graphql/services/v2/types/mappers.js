'use strict';

const strapiTypeToGraphQLScalar = {
  boolean: 'Boolean',
  integer: 'Int',
  string: 'String',
  biginteger: 'Long',
  float: 'Float',
  decimal: 'Float',
  json: 'JSON',
  date: 'Date',
  time: 'Time',
  datetime: 'DateTime',
  timestamp: 'DateTime',
};

module.exports = {
  strapiTypeToGraphQLScalar,
};
