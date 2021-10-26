'use strict';

const initErrorMiddleware = require('../middlewares/errors');

module.exports = ({ strapi }) => ({
  registerErrorMiddleware() {
    const errorMiddleware = initErrorMiddleware({ strapi });
    strapi.server.router.use('/upload', errorMiddleware);
  },
});
