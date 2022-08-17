'use strict';

const { toString } = require('lodash/fp');

const Field = require('./field');

class StringField extends Field {
  toDB(value) {
    return toString(value);
  }

  fromDB(value) {
    return toString(value);
  }
}

module.exports = StringField;
