'use strict';

const Field = require('./field');

class JSONField extends Field {
  toDB(value) {
    return JSON.stringify(value);
  }

  fromDB(value) {
    try {
      if (typeof value === 'string') return JSON.parse(value);
    } catch (error) {
      // Just return the value if it's not a valid JSON string
      return value;
    }
    return value;
  }
}

module.exports = JSONField;
