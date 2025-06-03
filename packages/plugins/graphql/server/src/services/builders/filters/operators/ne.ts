import type * as Nexus from 'nexus';

const NE_FIELD_NAME = 'ne';

export default () => ({
  fieldName: NE_FIELD_NAME,

  strapiOperator: '$ne',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(NE_FIELD_NAME, { type });
  },
});
