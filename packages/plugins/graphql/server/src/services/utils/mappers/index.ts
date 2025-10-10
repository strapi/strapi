import strapiScalarToGraphQLScalar from './strapi-scalar-to-graphql-scalar';
import graphQLFiltersToStrapiQuery from './graphql-filters-to-strapi-query';
import graphqlScalarToOperators from './graphql-scalar-to-operators';
import entityToResponseEntity from './entity-to-response-entity';

import type { Context } from '../../types';

export default (context: Context) => ({
  ...strapiScalarToGraphQLScalar(context),
  ...graphQLFiltersToStrapiQuery(context),
  ...graphqlScalarToOperators(context),
  ...entityToResponseEntity(),
});
