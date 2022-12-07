'use strict';

const AND_FIELD_NAME = 'and';

module.exports = () => ({
  fieldName: AND_FIELD_NAME,

  strapiOperator: '$and',

  add(t, type) {
    return t.field({ type: [type] });
  },
});
