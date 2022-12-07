'use strict';

const BETWEEN_FIELD_NAME = 'between';

module.exports = () => ({
  fieldName: BETWEEN_FIELD_NAME,

  strapiOperator: '$between',

  add(t, type) {
    return t.field({ type: [type] });
  },
});
