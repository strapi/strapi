'use strict';

const EQI_FIELD_NAME = 'eqi';

module.exports = () => ({
  fieldName: EQI_FIELD_NAME,

  strapiOperator: '$eqi',

  add(t, type) {
    t.field(EQI_FIELD_NAME, { type });
  },
});
