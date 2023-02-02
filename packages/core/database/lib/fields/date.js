'use strict';

const { parseDate } = require('./shared/parsers');
const Field = require('./field');

class DateField extends Field {
  toDB(value) {
    return parseDate(value);
  }

  fromDB(value) {
    return value;
  }
}

module.exports = DateField;
