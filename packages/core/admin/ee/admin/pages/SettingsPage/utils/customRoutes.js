const routes = [
  // TODO check if feature enabled
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "admin-audit-logs" */ '../pages/AuditLogs/ProtectedListPage'
      );

      return component;
    },
    to: '/settings/audit-logs',
    exact: true,
  },
];

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

export default routes;
