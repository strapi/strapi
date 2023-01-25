import adminPermissions from '../../../../../admin/src/permissions';

const ssoGlobalRoutes = strapi.features.isEnabled(strapi.features.SSO)
  ? [
      {
        intlLabel: { id: 'Settings.sso.title', defaultMessage: 'Single Sign-On' },
        to: '/settings/single-sign-on',
        id: 'sso',
        isDisplayed: false,
        permissions: adminPermissions.settings.sso.main,
      },
    ]
  : [];

const auditLogsRoutes = [
  // TODO check if feature enabled
  {
    intlLabel: { id: 'global.auditLogs', defaultMessage: 'Audit Logs' },
    to: '/settings/audit-logs?pageSize=50&page=1&sort=date:DESC',
    id: 'auditLogs',
    isDisplayed: false,
    permissions: adminPermissions.settings.auditLogs.main,
  },
];

const customGlobalLinks = [...ssoGlobalRoutes, ...auditLogsRoutes];

export default customGlobalLinks;
