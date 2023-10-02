'use strict';

const rateLimit = require('./rateLimit');

module.exports = {
  rateLimit,
  'data-transfer': require('./data-transfer'),
};
