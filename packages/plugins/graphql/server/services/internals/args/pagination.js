'use strict';

const { arg, inputObjectType } = require('nexus');

const PaginationInputType = inputObjectType({
  name: 'PaginationArg',

  definition(t) {
    t.int('page');
    t.int('pageSize');
    t.int('start');
    t.int('limit');
  },
});

module.exports = arg({
  type: PaginationInputType,
  default: {},
});
