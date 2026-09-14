'use strict';

const { isIPv4 } = require('node:net');

module.exports = (address) => {
  if (typeof address !== 'string') {
    return false;
  }

  const normalized = address.startsWith('::ffff:') ? address.slice(7) : address;

  return (
    normalized === '::1' ||
    normalized === '0:0:0:0:0:0:0:1' ||
    (isIPv4(normalized) && normalized.startsWith('127.'))
  );
};
