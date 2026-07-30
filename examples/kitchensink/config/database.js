/** @import { Core } from '@strapi/strapi' */

const path = require('path');

module.exports = ({ env }) => {
  /** @type {Core.Config.Database<'sqlite'>['connection']} */
  const connection = {
    client: 'sqlite',
    connection: {
      filename: path.join(__dirname, '..', env('DATABASE_FILENAME', '.tmp/data.db')),
    },
    useNullAsDefault: true,
  };

  return {
    connection,
  };
};
