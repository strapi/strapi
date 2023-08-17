import * as React from 'react';

export const SETTINGS_ROUTES_EE = [
  ...(window.strapi.features.isEnabled(window.strapi.features.AUDIT_LOGS)
    ? [
        {
          Component: React.lazy(() =>
            import(
              /* webpackChunkName: "audit-logs-settings-page" */ './pages/AuditLogs/ProtectedListPage'
            )
          ),
          path: '/settings/audit-logs',
        },
      ]
    : []),

  ...(window.strapi.features.isEnabled(window.strapi.features.REVIEW_WORKFLOWS)
    ? [
        {
          Component: React.lazy(() =>
            import(
              /* webpackChunkName: "review-workflows-settings-list-view" */ './pages/ReviewWorkflows/pages/ListView'
            )
          ),
          path: '/settings/review-workflows',
        },

        {
          Component: React.lazy(() =>
            import(
              /* webpackChunkName: "review-workflows-settings-create-view" */ './pages/ReviewWorkflows/pages/CreateView'
            )
          ),
          path: '/settings/review-workflows/create',
        },

        {
          Component: React.lazy(() =>
            import(
              /* webpackChunkName: "review-workflows-settings-edit-view" */ './pages/ReviewWorkflows/pages/EditView'
            )
          ),
          path: '/settings/review-workflows/:workflowId',
        },
      ]
    : []),

  ...(window.strapi.features.isEnabled(window.strapi.features.SSO)
    ? [
        {
          Component: React.lazy(() =>
            import(/* webpackChunkName: "sso-settings-page" */ './pages/SingleSignOn')
          ),
          path: '/settings/single-sign-on',
        },
      ]
    : []),
];
