'use strict';

const Field = require('./field');

class JSONField extends Field {
  toDB(value) {
    return JSON.stringify(value);
  }

  fromDB(value) {
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  }
}

module.exports = JSONField;
