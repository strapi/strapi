const path = require('path');

/**
 * @param {import('@strapi/strapi').Core.Config.Shared.ConfigParams} param0
 * @returns {import('@strapi/strapi').Core.Config.Database<'sqlite'>}
 */
module.exports = ({ env }) => ({
  connection: {
    client: 'sqlite',
    connection: {
      filename: path.join(__dirname, '..', env('DATABASE_FILENAME', '.tmp/data.db')),
    },
    useNullAsDefault: true,
  },
});
