'use strict';

module.exports = [
  {
    method: 'POST',
    path: '/',
    handler: 'Email.send',
    config: {
      policies: [],
      description: 'Send an email',
      tag: {
        plugin: 'email',
        name: 'Email',
      },
    },
  },
  {
    method: 'POST',
    path: '/test',
    handler: 'Email.test',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', options: { actions: ['plugin::email.settings.read'] } },
      ],
      description: 'Send an test email',
      tag: {
        plugin: 'email',
        name: 'Email',
      },
    },
  },
  {
    method: 'GET',
    path: '/settings',
    handler: 'Email.getSettings',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', options: { actions: ['plugin::email.settings.read'] } },
      ],
      description: 'Get the email settings',
      tag: {
        plugin: 'email',
        name: 'Email',
      },
    },
  },
];
