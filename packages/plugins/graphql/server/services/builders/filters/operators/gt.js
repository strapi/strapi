'use strict';

const GT_FIELD_NAME = 'gt';

module.exports = () => ({
  fieldName: GT_FIELD_NAME,

  strapiOperator: '$gt',

  add(t, type) {
    return t.field({ type });
  },
});
