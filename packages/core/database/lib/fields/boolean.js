'use strict';

const { toString } = require('lodash/fp');

const Field = require('./field');

class BooleanField extends Field {
  toDB(value) {
    if (typeof value === 'boolean') return value;

    if (['true', 't', '1', 1].includes(value)) {
      return true;
    }

    if (['false', 'f', '0', 0].includes(value)) {
      return false;
    }

    return Boolean(value);
  }

  fromDB(value) {
    if (typeof value === 'boolean') {
      return value;
    }

    const strVal = toString(value);

    if (strVal === '1') {
      return true;
    }
    if (strVal === '0') {
      return false;
    }
    return null;
  }
}

module.exports = BooleanField;
