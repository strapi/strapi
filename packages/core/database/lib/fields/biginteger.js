'use strict';

const { toString } = require('lodash/fp');

const NumberField = require('./number');

class BigIntegerField extends NumberField {
  toDB(value) {
    return toString(value);
  }

  fromDB(value) {
    return toString(value);
  }
}

module.exports = BigIntegerField;
