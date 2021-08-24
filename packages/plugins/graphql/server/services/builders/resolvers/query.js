'use strict';

const { omit } = require('lodash/fp');

module.exports = ({ strapi }) => ({
  buildQueriesResolvers: ({ contentType }) => {
    const { uid, kind } = contentType;

    if (kind === 'singleType') {
      return {
        async find() {
          return strapi.entityService.find(uid);
        },
      };
    }

    return {
      async find(source, args) {
        return strapi.entityService.find(uid, { params: args });
      },

      async findOne(source, args) {
        return strapi.entityService.findOne(uid, args.id, { params: omit('id', args) });
      },
    };
  },
});
