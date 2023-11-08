import type * as Nexus from 'nexus';

const STARTS_WITH_FIELD_NAME = 'startsWith';

export default () => ({
  fieldName: STARTS_WITH_FIELD_NAME,

  strapiOperator: '$startsWith',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(STARTS_WITH_FIELD_NAME, { type });
  },
});
