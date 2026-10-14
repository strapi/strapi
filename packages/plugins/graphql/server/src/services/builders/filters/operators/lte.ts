import type * as Nexus from 'nexus';

const LTE_FIELD_NAME = 'lte';

export default () => ({
  fieldName: LTE_FIELD_NAME,

  strapiOperator: '$lte',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(LTE_FIELD_NAME, { type });
  },
});
