'use strict';

const GTE_FIELD_NAME = 'gte';

module.exports = () => ({
  fieldName: GTE_FIELD_NAME,

  strapiOperator: '$gte',

  add(t, type) {
    t.field(GTE_FIELD_NAME, { type });
  },
});
