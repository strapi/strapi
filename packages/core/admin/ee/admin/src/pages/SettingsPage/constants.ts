import { RouteObject } from 'react-router-dom';

/**
 * All these routes are relative to the `/admin/settings/*` route
 * as such their path should not start with a `/` or include the `/settings` prefix.
 */
export const getEERoutes = (): RouteObject[] => [
  ...(window.strapi.features.isEnabled(window.strapi.features.AUDIT_LOGS)
    ? [
        {
          path: 'audit-logs',
          lazy: async () => {
            const { ProtectedListPage } = await import('./pages/AuditLogs/ListPage');

            return {
              Component: ProtectedListPage,
            };
          },
        },
      ]
    : []),
  ...(window.strapi.features.isEnabled(window.strapi.features.REVIEW_WORKFLOWS)
    ? [
        {
          path: 'review-workflows',
          lazy: async () => {
            const { ProtectedReviewWorkflowsPage } = await import(
              './pages/ReviewWorkflows/ListPage'
            );

            return {
              Component: ProtectedReviewWorkflowsPage,
            };
          },
        },
        {
          path: 'review-workflows/create',
          lazy: async () => {
            const { ReviewWorkflowsCreatePage } = await import(
              './pages/ReviewWorkflows/CreatePage'
            );

            return {
              Component: ReviewWorkflowsCreatePage,
            };
          },
        },
        {
          path: 'review-workflows/:workflowId',
          lazy: async () => {
            const { ReviewWorkflowsEditPage } = await import('./pages/ReviewWorkflows/EditPage');

            return {
              Component: ReviewWorkflowsEditPage,
            };
          },
        },
      ]
    : []),
  ...(window.strapi.features.isEnabled(window.strapi.features.SSO)
    ? [
        {
          path: 'single-sign-on',
          lazy: async () => {
            const { ProtectedSSO } = await import('./pages/SingleSignOnPage');

            return {
              Component: ProtectedSSO,
            };
          },
        },
      ]
    : []),
];
