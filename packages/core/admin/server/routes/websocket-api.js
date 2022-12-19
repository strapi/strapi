'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/websocket',
    handler: 'websocket-api.websocket',
    config: { auth: false },
  },
];
