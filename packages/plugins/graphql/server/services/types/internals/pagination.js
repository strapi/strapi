'use strict';

const { objectType } = require('nexus');

const { PAGINATION_TYPE_NAME } = require('../constants');

/**
 * Type definition for a Pagination object
 * @type {NexusObjectTypeDef}
 */
const Pagination = objectType({
  name: PAGINATION_TYPE_NAME,

  definition(t) {
    t.nonNull.int('total');
    t.nonNull.int('page');
    t.nonNull.int('pageSize');
    t.nonNull.int('pageCount');
  },
});

module.exports = Pagination;
