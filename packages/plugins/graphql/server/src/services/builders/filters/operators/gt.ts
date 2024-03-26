import type * as Nexus from 'nexus';

const GT_FIELD_NAME = 'gt';

export default () => ({
  fieldName: GT_FIELD_NAME,

  strapiOperator: '$gt',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(GT_FIELD_NAME, { type });
  },
});
