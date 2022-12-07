import strapiScalarToGraphQLScalar from './strapi-scalar-to-graphql-scalar';
import graphQLFiltersToStrapiQuery from './graphql-filters-to-strapi-query';
import graphqlScalarToOperators from './graphql-scalar-to-operators';
import entityToResponseEntity from './entity-to-response-entity';
import { StrapiCTX } from '../../../types/strapi-ctx';

export default (context: StrapiCTX) => ({
  ...strapiScalarToGraphQLScalar(context),
  ...graphQLFiltersToStrapiQuery(context),
  ...graphqlScalarToOperators(context),
  ...entityToResponseEntity(),
});
