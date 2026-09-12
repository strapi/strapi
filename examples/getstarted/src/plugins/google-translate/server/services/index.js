'use strict';

const credentials = require('./credentials');
const google = require('./google');
const translateEntry = require('./translate-entry');

module.exports = {
  credentials,
  google,
  'translate-entry': translateEntry,
};
