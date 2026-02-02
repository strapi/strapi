import { errors } from '@strapi/utils';
import type * as Nexus from 'nexus';
import type { Core } from '@strapi/types';

const { ValidationError } = errors;

const EQ_FIELD_NAME = 'eq';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  fieldName: EQ_FIELD_NAME,

  strapiOperator: '$eq',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    const { GRAPHQL_SCALARS } = strapi.plugin('graphql').service('constants');

    if (!GRAPHQL_SCALARS.includes(type)) {
      throw new ValidationError(
        `Can't use "${EQ_FIELD_NAME}" operator. "${type}" is not a valid scalar`
      );
    }

    t.field(EQ_FIELD_NAME, { type });
  },
});
