'use strict';

const strapi = require('../index');

/**
 * `$ strapi migrate`
 */
module.exports = async () => {
  await strapi().migrate();
  console.log('Migration completed successfully');
  process.exit(1);
};
