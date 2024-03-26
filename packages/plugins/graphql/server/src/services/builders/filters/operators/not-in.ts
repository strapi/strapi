import { list } from 'nexus';
import type * as Nexus from 'nexus';

const NOT_IN_FIELD_NAME = 'notIn';

export default () => ({
  fieldName: NOT_IN_FIELD_NAME,

  strapiOperator: '$notIn',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(NOT_IN_FIELD_NAME, { type: list(type) });
  },
});
