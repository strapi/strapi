'use strict';

const { toNumber } = require('lodash/fp');

const Field = require('./field');

class NumberField extends Field {
  toDB(value) {
    const numberValue = toNumber(value);

    if (Number.isNaN(numberValue)) {
      throw new Error(`Expected a valid Number, got ${value}`);
    }

    return numberValue;
  }

  fromDB(value) {
    return toNumber(value);
  }
}

module.exports = NumberField;
