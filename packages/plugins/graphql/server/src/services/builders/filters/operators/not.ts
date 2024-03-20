import type * as Nexus from 'nexus';
import type { Core } from '@strapi/types';

const NOT_FIELD_NAME = 'not';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  fieldName: NOT_FIELD_NAME,

  strapiOperator: '$not',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    const { naming, attributes } = strapi.plugin('graphql').service('utils');

    if (attributes.isGraphQLScalar({ type })) {
      t.field(NOT_FIELD_NAME, { type: naming.getScalarFilterInputTypeName(type) });
    } else {
      t.field(NOT_FIELD_NAME, { type });
    }
  },
});
