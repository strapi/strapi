import type * as Nexus from 'nexus';

const NOT_CONTAINSI_FIELD_NAME = 'notContainsi';

export default () => ({
  fieldName: NOT_CONTAINSI_FIELD_NAME,

  strapiOperator: '$notContainsi',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(NOT_CONTAINSI_FIELD_NAME, { type });
  },
});
