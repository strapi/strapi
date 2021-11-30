'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/',
      handler: 'email.send',
    },
  ],
};
