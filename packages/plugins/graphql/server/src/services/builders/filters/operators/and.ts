import { list } from 'nexus';
import type * as Nexus from 'nexus';

const AND_FIELD_NAME = 'and';

export default () => ({
  fieldName: AND_FIELD_NAME,

  strapiOperator: '$and',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(AND_FIELD_NAME, { type: list(type) });
  },
});
