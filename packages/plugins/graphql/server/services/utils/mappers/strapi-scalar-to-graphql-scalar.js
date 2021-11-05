'use strict';

const { get, difference } = require('lodash/fp');
const { ApplicationError } = require('@strapi/utils').errors;

module.exports = ({ strapi }) => {
  const { STRAPI_SCALARS, SCALARS_ASSOCIATIONS } = strapi.plugin('graphql').service('constants');

  const missingStrapiScalars = difference(STRAPI_SCALARS, Object.keys(SCALARS_ASSOCIATIONS));

  if (missingStrapiScalars.length > 0) {
    throw new ApplicationError('Some Strapi scalars are not handled in the GraphQL scalars mapper');
  }

  return {
    /**
     * Used to transform a Strapi scalar type into its GraphQL equivalent
     * @param {string} strapiScalar
     * @return {NexusGenScalars}
     */
    strapiScalarToGraphQLScalar(strapiScalar) {
      return get(strapiScalar, SCALARS_ASSOCIATIONS);
    },
  };
};
