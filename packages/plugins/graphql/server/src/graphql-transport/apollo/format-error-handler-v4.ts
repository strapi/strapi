import { unwrapResolverError } from '@apollo/server/errors';
import type { GraphQLFormattedError } from 'graphql';

import type { Core } from '@strapi/types';

import { formatStrapiGraphqlError } from '../../format-strapi-graphql-error';

/**
 * Apollo Server v4 `formatError` callback: unwraps Apollo's combined errors then applies Strapi mapping.
 */
export function createApolloV4FormatErrorHandler(strapi: Core.Strapi) {
  return (formattedError: GraphQLFormattedError, error: unknown) =>
    formatStrapiGraphqlError(strapi, formattedError, unwrapResolverError(error));
}
