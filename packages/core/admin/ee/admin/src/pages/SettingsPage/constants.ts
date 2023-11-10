import type { Route } from '../../../../../admin/src/pages/Settings/constants';

export const ROUTES_EE: Route[] = [
  ...(window.strapi.features.isEnabled(window.strapi.features.AUDIT_LOGS)
    ? [
        {
          async Component() {
            // @ts-expect-error – No types, yet.
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
            // @ts-expect-error – No types, yet.
            const component = await import('./pages/ReviewWorkflows/pages/ListView');

            return component;
          },
          to: '/settings/review-workflows',
          exact: true,
        },

        {
          async Component() {
            // @ts-expect-error – No types, yet.
            const component = await import('./pages/ReviewWorkflows/pages/CreateView');

            return component;
          },
          to: '/settings/review-workflows/create',
          exact: true,
        },

        {
          async Component() {
            // @ts-expect-error – No types, yet.
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
            const { ProtectedSSO } = await import('./pages/SingleSignOnPage');

            return ProtectedSSO;
          },
          to: '/settings/single-sign-on',
          exact: true,
        },
      ]
    : []),
];
