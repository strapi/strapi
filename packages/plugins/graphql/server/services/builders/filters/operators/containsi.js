'use strict';

const CONTAINSI_FIELD_NAME = 'containsi';

module.exports = () => ({
  fieldName: CONTAINSI_FIELD_NAME,

  strapiOperator: '$containsi',

  add(t, type) {
    t.field(CONTAINSI_FIELD_NAME, { type });
  },
});
