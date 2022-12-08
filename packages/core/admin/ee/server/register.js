'use strict';

const executeCERegister = require('../../server/register');

module.exports = async ({ strapi }) => {
  // TODO: register auditLogs provider here
  await executeCERegister({ strapi });
};
