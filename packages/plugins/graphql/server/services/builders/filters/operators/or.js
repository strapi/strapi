'use strict';

const OR_FIELD_NAME = 'or';

module.exports = () => ({
  fieldName: OR_FIELD_NAME,

  strapiOperator: '$or',

  add(t, type) {
    return t.field({ type: [type] });
  },
});
