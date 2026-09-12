import type * as Nexus from 'nexus';
import type { Core, Schema } from '@strapi/types';

const NOT_FIELD_NAME = 'not';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  fieldName: NOT_FIELD_NAME,

  strapiOperator: '$not',

  add(t: Nexus.blocks.InputDefinitionBlock<string>, type: string) {
    const { naming, attributes } = strapi.plugin('graphql').service('utils');

    if (attributes.isGraphQLScalar({ type } as Schema.Attribute.AnyAttribute)) {
      t.field(NOT_FIELD_NAME, { type: naming.getScalarFilterInputTypeName(type) });
    } else {
      t.field(NOT_FIELD_NAME, { type });
    }
  },
});
