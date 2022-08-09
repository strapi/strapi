'use strict';

const dateFns = require('date-fns');

const { parseDateTimeOrTimestamp } = require('./shared/parsers');
const Field = require('./field');

class TimestampField extends Field {
  toDB(value) {
    return parseDateTimeOrTimestamp(value);
  }

  fromDB(value) {
    const cast = new Date(value);
    return dateFns.isValid(cast) ? dateFns.format(cast, 'T') : null;
  }
}

module.exports = TimestampField;
