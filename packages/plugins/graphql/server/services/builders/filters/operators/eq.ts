import { StrapiCTX } from '../../../../types/strapi-ctx';

const { ValidationError } = require('@strapi/utils').errors;

const EQ_FIELD_NAME = 'eq';

export default ({ strapi }: StrapiCTX) => ({
  fieldName: EQ_FIELD_NAME,

  strapiOperator: '$eq',

  add(t, type) {
    const { GRAPHQL_SCALARS } = strapi.plugin('graphql').service('constants');

    if (!GRAPHQL_SCALARS.includes(type)) {
      throw new ValidationError(
        `Can't use "${EQ_FIELD_NAME}" operator. "${type}" is not a valid scalar`
      );
    }

    return t.field({ type });
  },
});
