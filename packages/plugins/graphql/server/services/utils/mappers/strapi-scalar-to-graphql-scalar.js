'use strict';

const { get, difference } = require('lodash/fp');

const associations = {
  boolean: 'Boolean',
  integer: 'Int',
  string: 'String',
  richtext: 'String',
  biginteger: 'Long',
  float: 'Float',
  decimal: 'Float',
  json: 'JSON',
  date: 'Date',
  time: 'Time',
  datetime: 'DateTime',
  timestamp: 'DateTime',
};

module.exports = ({ strapi }) => {
  const { STRAPI_SCALARS } = strapi.plugin('graphql').service('constants');

  const missingStrapiScalars = difference(STRAPI_SCALARS, Object.keys(associations));

  if (missingStrapiScalars.length > 0) {
    throw new Error('Some Strapi scalars are not handled in the GraphQL scalars mapper');
  }

  return {
    /**
     * Used to transform a Strapi scalar type into its GraphQL equivalent
     * @param {string} strapiScalar
     * @return {NexusGenScalars}
     */
    strapiScalarToGraphQLScalar(strapiScalar) {
      return get(strapiScalar, associations);
    },
  };
};
