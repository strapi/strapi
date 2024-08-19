import type { Route } from '../../../../../admin/src/pages/Settings/constants';

export const ROUTES_EE: Route[] = [
  ...(window.strapi.features.isEnabled(window.strapi.features.AUDIT_LOGS)
    ? [
        {
          async Component() {
            const { ProtectedListPage } = await import('./pages/AuditLogs/ListPage');

            return ProtectedListPage;
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
            const { ProtectedReviewWorkflowsPage } = await import(
              './pages/ReviewWorkflows/ListPage'
            );

            return ProtectedReviewWorkflowsPage;
          },
          to: '/settings/review-workflows',
          exact: true,
        },

        {
          async Component() {
            const { ReviewWorkflowsCreatePage } = await import(
              './pages/ReviewWorkflows/CreatePage'
            );

            return ReviewWorkflowsCreatePage;
          },
          to: '/settings/review-workflows/create',
          exact: true,
        },

        {
          async Component() {
            const { ReviewWorkflowsEditPage } = await import('./pages/ReviewWorkflows/EditPage');

            return ReviewWorkflowsEditPage;
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
            const { ProtectedSSO } = await import('./pages/SingleSignOnPage');

            return ProtectedSSO;
          },
          to: '/settings/single-sign-on',
          exact: true,
        },
      ]
    : []),
];
