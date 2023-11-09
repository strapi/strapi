import { list } from 'nexus';
import type * as Nexus from 'nexus';

const OR_FIELD_NAME = 'or';

export default () => ({
  fieldName: OR_FIELD_NAME,

  strapiOperator: '$or',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(OR_FIELD_NAME, { type: list(type) });
  },
});
