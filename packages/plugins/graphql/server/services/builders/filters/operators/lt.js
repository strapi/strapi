'use strict';

const LT_FIELD_NAME = 'lt';

module.exports = () => ({
  fieldName: LT_FIELD_NAME,

  strapiOperator: '$lt',

  add(t, type) {
    return t.field({ type });
  },
});
