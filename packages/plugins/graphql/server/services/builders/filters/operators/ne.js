'use strict';

const NE_FIELD_NAME = 'ne';

module.exports = () => ({
  fieldName: NE_FIELD_NAME,

  strapiOperator: '$ne',

  add(t, type) {
    return t.field({ type });
  },
});
