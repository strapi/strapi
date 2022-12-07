'use strict';

const GTE_FIELD_NAME = 'gte';

module.exports = () => ({
  fieldName: GTE_FIELD_NAME,

  strapiOperator: '$gte',

  add(t, type) {
    return t.field({ type });
  },
});
