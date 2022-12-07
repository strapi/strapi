'use strict';

const CONTAINS_FIELD_NAME = 'contains';

module.exports = () => ({
  fieldName: CONTAINS_FIELD_NAME,

  strapiOperator: '$contains',

  add(t, type) {
    return t.field({ type });
  },
});
