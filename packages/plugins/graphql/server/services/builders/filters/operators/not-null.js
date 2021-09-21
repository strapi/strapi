'use strict';

const NOT_NULL_FIELD_NAME = 'notNull';

module.exports = () => ({
  fieldName: NOT_NULL_FIELD_NAME,

  strapiOperator: '$notNull',

  add(t) {
    t.boolean(NOT_NULL_FIELD_NAME);
  },
});
