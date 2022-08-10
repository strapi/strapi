'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/webhooks',
    handler: 'webhooks.listWebhooks',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::webhooks.read'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/webhooks',
    handler: 'webhooks.createWebhook',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::webhooks.create'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/webhooks/:id',
    handler: 'webhooks.getWebhook',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::webhooks.read'] } },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/webhooks/:id',
    handler: 'webhooks.updateWebhook',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::webhooks.update'] } },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/webhooks/:id',
    handler: 'webhooks.deleteWebhook',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::webhooks.delete'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/webhooks/batch-delete',
    handler: 'webhooks.deleteWebhooks',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::webhooks.delete'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/webhooks/:id/trigger',
    handler: 'webhooks.triggerWebhook',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::webhooks.update'] } },
      ],
    },
  },
];
