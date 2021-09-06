'use strict';

module.exports = {
  type: 'content-api',
  // TODO:
  routes: [
    {
      method: 'POST',
      path: '/auth/local',
      handler: 'auth.callback',
      config: {
        auth: { public: true },
        policies: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
    },
    {
      method: 'POST',
      path: '/auth/local/register',
      handler: 'auth.register',
      config: {
        auth: { public: true },
        policies: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
    },
  ],
};
