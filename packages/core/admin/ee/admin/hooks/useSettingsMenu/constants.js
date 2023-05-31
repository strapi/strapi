import adminPermissions from '../../../../admin/src/permissions';

export const LINKS_EE = {
  global: [
    ...(window.strapi.features.isEnabled(window.strapi.features.SSO)
      ? [
          {
            intlLabel: { id: 'Settings.sso.title', defaultMessage: 'Single Sign-On' },
            to: '/settings/single-sign-on',
            id: 'sso',
            isDisplayed: false,
            permissions: adminPermissions.settings.sso.main,
          },
        ]
      : []),

    ...(window.strapi.features.isEnabled(window.strapi.features.REVIEW_WORKFLOWS)
      ? [
          {
            intlLabel: {
              id: 'Settings.review-workflows.page.title',
              defaultMessage: 'Review Workflows',
            },
            to: '/settings/review-workflows',
            id: 'review-workflows',
            isDisplayed: false,
            permissions: adminPermissions.settings['review-workflows'].main,
          },
        ]
      : []),
  ],

  admin: [
    ...(window.strapi.features.isEnabled(window.strapi.features.AUDIT_LOGS)
      ? [
          {
            intlLabel: { id: 'global.auditLogs', defaultMessage: 'Audit Logs' },
            to: '/settings/audit-logs?pageSize=50&page=1&sort=date:DESC',
            id: 'auditLogs',
            isDisplayed: false,
            permissions: adminPermissions.settings.auditLogs.main,
          },
        ]
      : []),
  ],
};
