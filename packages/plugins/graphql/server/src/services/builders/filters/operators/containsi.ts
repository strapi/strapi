import type * as Nexus from 'nexus';

const CONTAINSI_FIELD_NAME = 'containsi';

export default () => ({
  fieldName: CONTAINSI_FIELD_NAME,

  strapiOperator: '$containsi',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(CONTAINSI_FIELD_NAME, { type });
  },
});
