import { list } from 'nexus';
import type * as Nexus from 'nexus';

const BETWEEN_FIELD_NAME = 'between';

export default () => ({
  fieldName: BETWEEN_FIELD_NAME,

  strapiOperator: '$between',

  add(t: Nexus.blocks.ObjectDefinitionBlock<string>, type: string) {
    t.field(BETWEEN_FIELD_NAME, { type: list(type) });
  },
});
