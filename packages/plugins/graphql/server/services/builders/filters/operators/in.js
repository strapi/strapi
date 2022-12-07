'use strict';

const IN_FIELD_NAME = 'in';

module.exports = () => ({
  fieldName: IN_FIELD_NAME,

  strapiOperator: '$in',

  add(t, type) {
    return t.field({ type: [type] });
  },
});
