'use strict';

const Field = require('./field');

class JSONField extends Field {
  toDB(value) {
    try {
      JSON.parse(value);
    } catch (e) {
      throw new Error(`Invalid JSON value`);
    }
    return JSON.stringify(value);
  }

  fromDB(value) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        throw new Error(`Invalid JSON value`);
      }
    }
    return value;
  }
}

module.exports = JSONField;
