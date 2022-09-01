'use strict';

const { parseTime } = require('./shared/parsers');
const Field = require('./field');

class TimeField extends Field {
  toDB(value) {
    return parseTime(value);
  }

  fromDB(value) {
    // make sure that's a string with valid format ?
    return value;
  }
}

module.exports = TimeField;
