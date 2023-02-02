'use strict';

const { remote } = require('@strapi/data-transfer/lib/strapi');

module.exports = {
  connect: remote.handlers.createTransferHandler(),
};
