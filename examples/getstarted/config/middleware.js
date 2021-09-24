'use strict';

const responseHandlers = require('./src/response-handlers');

module.exports = {
  settings: {
    cors: {
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'Cache-Control'],
    },
    responses: {
      enabled: true,
      handlers: responseHandlers,
    },
  },
};
