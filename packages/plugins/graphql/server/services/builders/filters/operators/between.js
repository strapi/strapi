'use strict';

const { list } = require('nexus');

const BETWEEN_FIELD_NAME = 'between';

module.exports = () => ({
  fieldName: BETWEEN_FIELD_NAME,

  strapiOperator: '$between',

  add(t, type) {
    t.field(BETWEEN_FIELD_NAME, { type: list(type) });
  },
});
