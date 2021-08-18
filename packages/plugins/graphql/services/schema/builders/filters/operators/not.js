'use strict';

const NOT_FIELD_NAME = 'not';

const { isGraphQLScalar, getScalarFilterInputTypeName } = require('../../../../types/utils');

module.exports = {
  fieldName: NOT_FIELD_NAME,

  strapiOperator: '$not',

  add(t, type) {
    if (isGraphQLScalar({ type })) {
      t.field(NOT_FIELD_NAME, { type: getScalarFilterInputTypeName(type) });
    } else {
      t.field(NOT_FIELD_NAME, { type });
    }
  },
};
