'use strict';

const { pick } = require('lodash/fp');

const pickCreateArgs = pick(['params', 'data', 'files']);

const buildMutationsResolvers = ({ contentType, strapi }) => {
  // todo[v4]: handle single type
  const { uid } = contentType;

  return {
    async create(source, args) {
      // todo[v4]: Might be interesting to generate dynamic yup schema to validate payloads with more complex checks (on top of graphql validation)
      const params = pickCreateArgs(args);

      // todo[v4]: Sanitize args to only keep params / data / files (or do it in the base resolver)
      return strapi.entityService.create(uid, params);
    },

    async update(source, args) {
      const { id, data } = args;

      return strapi.entityService.update(uid, id, { data });
    },

    async delete(source, args) {
      const { id, ...rest } = args;

      return strapi.entityService.delete(uid, id, rest);
    },
  };
};

module.exports = { buildMutationsResolvers };
