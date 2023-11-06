'use strict';

const NEI_FIELD_NAME = 'nei';

module.exports = () => ({
  fieldName: NEI_FIELD_NAME,

  strapiOperator: '$nei',

  add(t, type) {
    t.field(NEI_FIELD_NAME, { type });
  },
});
