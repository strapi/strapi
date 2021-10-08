'use strict';

const { getOr, toNumber, isString, isBuffer } = require('lodash/fp');
const bcrypt = require('bcrypt');

const transforms = {
  password(value, context) {
    const { action, attribute } = context;

    if (!isString(value) && !isBuffer(value)) {
      return value;
    }

    if (action !== 'create' && action !== 'update') {
      return value;
    }

    const rounds = toNumber(getOr(10, 'encryption.rounds', attribute));

    return bcrypt.hashSync(value, rounds);
  },
};

module.exports = transforms;
