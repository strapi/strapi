'use strict';

const strapiAdmin = require('strapi-admin');

// build script shoul only run in production mode
process.env.NODE_ENV = 'production';
module.exports = () => {
  strapiAdmin.build({ dir: process.cwd(), env: 'production' });
};
