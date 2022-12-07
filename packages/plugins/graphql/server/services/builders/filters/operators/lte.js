'use strict';

const LTE_FIELD_NAME = 'lte';

module.exports = () => ({
  fieldName: LTE_FIELD_NAME,

  strapiOperator: '$lte',

  add(t, type) {
    return t.field({ type });
  },
});
