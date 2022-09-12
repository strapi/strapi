'use strict';

/**
 * Client
 */
module.exports = ({ client }) => {
  switch (client) {
    case 'sqlite-legacy':
      return 'sqlite';
    default:
      return client;
  }
};
