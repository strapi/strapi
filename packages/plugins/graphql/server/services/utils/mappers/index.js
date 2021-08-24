'use strict';

const strapiScalarToGraphQLScalar = require('./strapi-scalar-to-graphql-scalar');
const graphQLFiltersToStrapiQuery = require('./graphql-filters-to-strapi-query');
const graphqlScalarToOperators = require('./graphql-scalar-to-operators');
const entityToResponseEntity = require('./entity-to-response-entity');

module.exports = context => ({
  ...strapiScalarToGraphQLScalar(context),
  ...graphQLFiltersToStrapiQuery(context),
  ...graphqlScalarToOperators(context),
  ...entityToResponseEntity(context),
});
