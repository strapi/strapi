export const LINKS_CE = {
  global: [
    {
      intlLabel: { id: 'Settings.application.title', defaultMessage: 'Overview' },
      to: '/settings/application-infos',
      id: '000-application-infos',
      permissions: [],
    },
    {
      intlLabel: { id: 'Settings.webhooks.title', defaultMessage: 'Webhooks' },
      to: '/settings/webhooks',
      id: 'webhooks',
    },
    {
      intlLabel: { id: 'Settings.apiTokens.title', defaultMessage: 'API Tokens' },
      to: '/settings/api-tokens?sort=name:ASC',
      id: 'api-tokens',
    },
    {
      intlLabel: { id: 'Settings.transferTokens.title', defaultMessage: 'Transfer Tokens' },
      to: '/settings/transfer-tokens?sort=name:ASC',
      id: 'transfer-tokens',
    },
    // If the Enterprise feature is not enabled and if the config doesn't disable it, we promote the Enterprise feature by displaying them in the settings menu.
    // Disable this by adding "promoteEE: false" to your `./config/admin.js` file
    ...(!window.strapi.features.isEnabled(window.strapi.features.SSO) &&
    window.strapi?.flags?.promoteEE
      ? [
          {
            intlLabel: { id: 'Settings.sso.title', defaultMessage: 'Single Sign-On' },
            to: '/settings/purchase-single-sign-on',
            id: 'sso',
            lockIcon: true,
          },
        ]
      : []),

    ...(!window.strapi.features.isEnabled(window.strapi.features.REVIEW_WORKFLOWS) &&
    window.strapi?.flags?.promoteEE
      ? [
          {
            intlLabel: {
              id: 'Settings.review-workflows.page.title',
              defaultMessage: 'Review Workflows',
            },
            to: '/settings/purchase-review-workflows',
            id: 'review-workflows',
            lockIcon: true,
          },
        ]
      : []),
  ],

  admin: [
    {
      intlLabel: { id: 'global.roles', defaultMessage: 'Roles' },
      to: '/settings/roles',
      id: 'roles',
    },
    {
      intlLabel: { id: 'global.users' },
      // Init the search params directly
      to: '/settings/users?pageSize=10&page=1&sort=firstname',
      id: 'users',
    },
    ...(!window.strapi.features.isEnabled(window.strapi.features.AUDIT_LOGS) &&
    window.strapi?.flags?.promoteEE
      ? [
          {
            intlLabel: { id: 'global.auditLogs', defaultMessage: 'Audit Logs' },
            to: '/settings/purchase-audit-logs',
            id: 'auditLogs',
            lockIcon: true,
          },
        ]
      : []),
  ],
};
