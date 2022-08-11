'use strict';

const dateFns = require('date-fns');

const { parseDateTimeOrTimestamp } = require('./shared/parsers');
const Field = require('./field');

class DatetimeField extends Field {
  toDB(value) {
    return parseDateTimeOrTimestamp(value);
  }

  fromDB(value) {
    const cast = new Date(value);
    return dateFns.isValid(cast) ? cast.toISOString() : null;
  }
}

module.exports = DatetimeField;
