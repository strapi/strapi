'use strict';

const { list } = require('nexus');

const IN_FIELD_NAME = 'in';

module.exports = () => ({
  fieldName: IN_FIELD_NAME,

  strapiOperator: '$in',

  add(t, type) {
    t.field(IN_FIELD_NAME, { type: list(type) });
  },
});
