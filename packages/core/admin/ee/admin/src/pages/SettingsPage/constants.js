export const ROUTES_EE = [
  ...(window.strapi.features.isEnabled(window.strapi.features.AUDIT_LOGS)
    ? [
        {
          async Component() {
            const component = await import('./pages/AuditLogs/ProtectedListPage');

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
            const component = await import('./pages/ReviewWorkflows/pages/ListView');

            return component;
          },
          to: '/settings/review-workflows',
          exact: true,
        },

        {
          async Component() {
            const component = await import('./pages/ReviewWorkflows/pages/CreateView');

            return component;
          },
          to: '/settings/review-workflows/create',
          exact: true,
        },

        {
          async Component() {
            const component = await import('./pages/ReviewWorkflows/pages/EditView');

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
            const component = await import('./pages/SingleSignOn');

            return component;
          },
          to: '/settings/single-sign-on',
          exact: true,
        },
      ]
    : []),
];
