'use strict';

const { builder } = require('../../builders/pothosBuilder');

const PaginationInputType = builder.inputType('PaginationArg', {
  fields(t) {
    return {
      page: t.int(),
      pageSize: t.int(),
      start: t.int(),
      limit: t.int(),
    };
  },
});

module.exports = (t) =>
  t.arg({
    type: PaginationInputType,
    default: {},
  });
