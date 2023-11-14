import type * as Nexus from 'nexus';

const LT_FIELD_NAME = 'lt';

export default () => ({
  fieldName: LT_FIELD_NAME,

  strapiOperator: '$lt',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(LT_FIELD_NAME, { type });
  },
});
