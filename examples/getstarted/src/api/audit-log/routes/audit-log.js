'use strict';

/**
 * audit-log router
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'audit-log.find',
      config: {
        auth: false, // For testing purposes
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/stats',
      handler: 'audit-log.getStats',
      config: {
        auth: false, // For testing purposes
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/:id',
      handler: 'audit-log.findOne',
      config: {
        auth: false, // For testing purposes
      },
    },
  ],
};
