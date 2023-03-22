const routes = [];

if (strapi.features.isEnabled(strapi.features.SSO)) {
  routes.push({
    async Component() {
      const component = await import(
        /* webpackChunkName: "sso-settings-page" */ '../pages/SingleSignOn'
      );

      return component;
    },
    to: '/settings/single-sign-on',
    exact: true,
  });
}

if (strapi.features.isEnabled(strapi.features.AUDIT_LOGS)) {
  routes.push({
    async Component() {
      const component = await import(
        /* webpackChunkName: "audit-logs-settings-page" */ '../pages/AuditLogs/ProtectedListPage'
      );

      return component;
    },
    to: '/settings/audit-logs',
    exact: true,
  });
}

export default routes;
