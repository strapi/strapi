'use strict';

const CONTAINSI_FIELD_NAME = 'containsi';

module.exports = () => ({
  fieldName: CONTAINSI_FIELD_NAME,

  strapiOperator: '$containsi',

  add(t, type) {
    return t.field({ type });
  },
});
