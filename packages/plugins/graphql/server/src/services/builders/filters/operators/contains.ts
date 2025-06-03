import type * as Nexus from 'nexus';

const CONTAINS_FIELD_NAME = 'contains';

export default () => ({
  fieldName: CONTAINS_FIELD_NAME,

  strapiOperator: '$contains',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(CONTAINS_FIELD_NAME, { type });
  },
});
