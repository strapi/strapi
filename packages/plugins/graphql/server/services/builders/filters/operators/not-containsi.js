'use strict';

const NOT_CONTAINSI_FIELD_NAME = 'notContainsi';

module.exports = () => ({
  fieldName: NOT_CONTAINSI_FIELD_NAME,

  strapiOperator: '$notContainsi',

  add(t, type) {
    t.field(NOT_CONTAINSI_FIELD_NAME, { type });
  },
});
