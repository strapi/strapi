'use strict';

const NULL_FIELD_NAME = 'null';

module.exports = () => ({
  fieldName: NULL_FIELD_NAME,

  strapiOperator: '$null',

  add(t) {
    return t.boolean();
  },
});
