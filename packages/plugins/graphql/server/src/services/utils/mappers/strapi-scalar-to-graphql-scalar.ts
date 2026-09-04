import { get, difference } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { StrapiContext } from '../../types';

const { ApplicationError } = errors;

export default ({ strapi }: StrapiContext) => {
  const { STRAPI_SCALARS, SCALARS_ASSOCIATIONS } = strapi.plugin('graphql').service('constants');

  const missingStrapiScalars = difference(STRAPI_SCALARS, Object.keys(SCALARS_ASSOCIATIONS));

  if (missingStrapiScalars.length > 0) {
    throw new ApplicationError('Some Strapi scalars are not handled in the GraphQL scalars mapper');
  }

  return {
    /**
     * Used to transform a Strapi scalar type into its GraphQL equivalent
     */
    strapiScalarToGraphQLScalar(strapiScalar: string) {
      return get(strapiScalar, SCALARS_ASSOCIATIONS);
    },
  };
};
