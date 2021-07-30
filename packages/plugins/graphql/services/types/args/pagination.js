'use strict';

const { arg, inputObjectType } = require('nexus');

const PaginationInputType = inputObjectType({
  name: 'PaginationArg',

  definition(t) {
    // todo[v4]: Set defaults for each of the attributes (need to handle custom config before)
    t.int('page');
    t.int('pageSize');
    t.int('start');
    t.int('limit');
  },
});

const PaginationArg = arg({
  type: PaginationInputType,
  default: {},
});

module.exports = { PaginationArg };
