import type * as Nexus from 'nexus';

const NOT_CONTAINS_FIELD_NAME = 'notContains';

export default () => ({
  fieldName: NOT_CONTAINS_FIELD_NAME,

  strapiOperator: '$notContains',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(NOT_CONTAINS_FIELD_NAME, { type });
  },
});
