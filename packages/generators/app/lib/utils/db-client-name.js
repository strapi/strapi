'use strict';

/**
 * Client
 */
module.exports = ({ client }) => {
  switch (client) {
    case 'sqlite-legacy':
      return 'sqlite';
    case 'mysql2':
      return 'mysql';
    default:
      return client;
  }
};
