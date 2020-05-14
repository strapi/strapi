'use strict';

const crypto = require('crypto');

/**
 * Generate a random token
 * @returns {string}
 */
function generate() {
  return crypto.randomBytes(64).toString('hex');
}

module.exports = {
  generate,
};
