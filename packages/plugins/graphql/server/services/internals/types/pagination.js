'use strict';

const { objectType } = require('nexus');

module.exports = ({ strapi }) => {
  const { PAGINATION_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return {
    /**
     * Type definition for a Pagination object
     * @type {NexusObjectTypeDef}
     */
    Pagination: objectType({
      name: PAGINATION_TYPE_NAME,

      definition(t) {
        t.nonNull.int('total');
        t.nonNull.int('page');
        t.nonNull.int('pageSize');
        t.nonNull.int('pageCount');
      },
    }),
  };
};
