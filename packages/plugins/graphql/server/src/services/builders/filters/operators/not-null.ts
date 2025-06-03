import type * as Nexus from 'nexus';

const NOT_NULL_FIELD_NAME = 'notNull';

export default () => ({
  fieldName: NOT_NULL_FIELD_NAME,

  strapiOperator: '$notNull',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>) {
    t.boolean(NOT_NULL_FIELD_NAME);
  },
});
