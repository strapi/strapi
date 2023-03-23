'use strict';

const { omit } = require('lodash/fp');
const { sanitize } = require('@strapi/utils');

module.exports = ({ strapi }) => ({
  buildQueriesResolvers({ contentType }) {
    const { uid } = contentType;

    return {
      async find(parent, args, ctx) {
        const sanitizedQuery = await sanitize.contentAPI.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        return strapi.entityService.findMany(uid, sanitizedQuery);
      },

      async findOne(parent, args, ctx) {
        const sanitizedQuery = await sanitize.contentAPI.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        return strapi.entityService.findOne(uid, args.id, omit('id', sanitizedQuery));
      },
    };
  },
});
