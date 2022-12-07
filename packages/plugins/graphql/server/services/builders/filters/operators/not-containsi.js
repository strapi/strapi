'use strict';

const NOT_CONTAINSI_FIELD_NAME = 'notContainsi';

module.exports = () => ({
  fieldName: NOT_CONTAINSI_FIELD_NAME,

  strapiOperator: '$notContainsi',

  add(t, type) {
    return t.field({ type });
  },
});
