export const ROUTES_EE = [
  ...(window.strapi.features.isEnabled(window.strapi.features.AUDIT_LOGS)
    ? [
        {
          async Component() {
            const component = await import(
              /* webpackChunkName: "audit-logs-settings-page" */ './pages/AuditLogs/ProtectedListPage'
            );

            return component;
          },
          to: '/settings/audit-logs',
          exact: true,
        },
      ]
    : []),

  ...(window.strapi.features.isEnabled(window.strapi.features.REVIEW_WORKFLOWS)
    ? [
        {
          async Component() {
            const component = await import(
              /* webpackChunkName: "review-workflows-settings-list-view" */ './pages/ReviewWorkflows/pages/ListView'
            );

            return component;
          },
          to: '/settings/review-workflows',
          exact: true,
        },

        {
          async Component() {
            const component = await import(
              /* webpackChunkName: "review-workflows-settings-create-view" */ './pages/ReviewWorkflows/pages/CreateView'
            );

            return component;
          },
          to: '/settings/review-workflows/create',
          exact: true,
        },

        {
          async Component() {
            const component = await import(
              /* webpackChunkName: "review-workflows-settings-edit-view" */ './pages/ReviewWorkflows/pages/EditView'
            );

            return component;
          },
          to: '/settings/review-workflows/:workflowId',
          exact: true,
        },
      ]
    : []),

  ...(window.strapi.features.isEnabled(window.strapi.features.SSO)
    ? [
        {
          async Component() {
            const component = await import(
              /* webpackChunkName: "sso-settings-page" */ './pages/SingleSignOn'
            );

            return component;
          },
          to: '/settings/single-sign-on',
          exact: true,
        },
      ]
    : []),
];
