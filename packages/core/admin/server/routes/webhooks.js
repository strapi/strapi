'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/webhooks',
    handler: 'Webhooks.listWebhooks',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', options: { actions: ['admin::webhooks.read'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/webhooks',
    handler: 'Webhooks.createWebhook',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', options: { actions: ['admin::webhooks.create'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/webhooks/:id',
    handler: 'Webhooks.getWebhook',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', options: { actions: ['admin::webhooks.read'] } },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/webhooks/:id',
    handler: 'Webhooks.updateWebhook',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', options: { actions: ['admin::webhooks.update'] } },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/webhooks/:id',
    handler: 'Webhooks.deleteWebhook',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', options: { actions: ['admin::webhooks.delete'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/webhooks/batch-delete',
    handler: 'Webhooks.deleteWebhooks',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', options: { actions: ['admin::webhooks.delete'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/webhooks/:id/trigger',
    handler: 'Webhooks.triggerWebhook',
    config: {
      policies: [],
    },
  },
];
