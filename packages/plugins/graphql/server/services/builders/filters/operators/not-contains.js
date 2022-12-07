'use strict';

const NOT_CONTAINS_FIELD_NAME = 'notContains';

module.exports = () => ({
  fieldName: NOT_CONTAINS_FIELD_NAME,

  strapiOperator: '$notContains',

  add(t, type) {
    return t.field({ type });
  },
});
