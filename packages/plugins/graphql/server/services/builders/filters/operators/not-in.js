'use strict';

const { list } = require('nexus');

const NOT_IN_FIELD_NAME = 'notIn';

module.exports = () => ({
  fieldName: NOT_IN_FIELD_NAME,

  strapiOperator: '$notIn',

  add(t, type) {
    t.field(NOT_IN_FIELD_NAME, { type: list(type) });
  },
});
