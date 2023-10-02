'use strict';

module.exports = {
  sso: [
    {
      uid: 'provider-login.read',
      displayName: 'Read',
      pluginName: 'admin',
      section: 'settings',
      category: 'single sign on',
      subCategory: 'options',
    },
    {
      uid: 'provider-login.update',
      displayName: 'Update',
      pluginName: 'admin',
      section: 'settings',
      category: 'single sign on',
      subCategory: 'options',
    },
  ],
  auditLogs: [
    {
      uid: 'audit-logs.read',
      displayName: 'Read',
      pluginName: 'admin',
      section: 'settings',
      category: 'audit logs',
      subCategory: 'options',
    },
  ],
  reviewWorkflows: [
    {
      uid: 'review-workflows.create',
      displayName: 'Create',
      pluginName: 'admin',
      section: 'settings',
      category: 'review workflows',
      subCategory: 'options',
    },
    {
      uid: 'review-workflows.read',
      displayName: 'Read',
      pluginName: 'admin',
      section: 'settings',
      category: 'review workflows',
      subCategory: 'options',
    },
    {
      uid: 'review-workflows.update',
      displayName: 'Update',
      pluginName: 'admin',
      section: 'settings',
      category: 'review workflows',
      subCategory: 'options',
    },
    {
      uid: 'review-workflows.delete',
      displayName: 'Delete',
      pluginName: 'admin',
      section: 'settings',
      category: 'review workflows',
      subCategory: 'options',
    },
    {
      uid: 'review-workflows.stage.transition',
      displayName: 'Change stage',
      pluginName: 'admin',
      section: 'internal',
    },
  ],
};
