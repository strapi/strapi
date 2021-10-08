'use strict';

const { getOr, toNumber } = require('lodash/fp');
const bcrypt = require('bcrypt');

const transforms = {
  password(value, context) {
    const { action, attribute } = context;

    if (action !== 'create' && action !== 'update') {
      return value;
    }

    const rounds = toNumber(getOr(10, 'encryption.rounds', attribute));

    return bcrypt.hashSync(value, rounds);
  },
};

module.exports = transforms;
