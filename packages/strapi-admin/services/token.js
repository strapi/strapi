'use strict';

const crypto = require('crypto');

module.exports = {
  generate() {
    return crypto.randomBytes(64).toString('hex');
  },
};
