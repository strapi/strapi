import { list } from 'nexus';
import type * as Nexus from 'nexus';

const IN_FIELD_NAME = 'in';

export default () => ({
  fieldName: IN_FIELD_NAME,

  strapiOperator: '$in',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(IN_FIELD_NAME, { type: list(type) });
  },
});
