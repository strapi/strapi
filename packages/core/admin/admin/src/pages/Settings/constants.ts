import { MenuItem } from '@strapi/helper-plugin';

export interface Route
  extends Pick<MenuItem, 'exact' | 'to'>,
    Required<Pick<MenuItem, 'Component'>> {}

export const ROUTES_CE: Route[] = [
  {
    async Component() {
      const { ProtectedListPage } = await import('./pages/Roles/ListPage');

      return ProtectedListPage;
    },
    to: '/settings/roles',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedCreatePage } = await import('./pages/Roles/CreatePage');

      return ProtectedCreatePage;
    },
    to: '/settings/roles/duplicate/:id',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedCreatePage } = await import('./pages/Roles/CreatePage');

      return ProtectedCreatePage;
    },
    to: '/settings/roles/new',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedEditPage } = await import('./pages/Roles/EditPage');

      return ProtectedEditPage;
    },
    to: '/settings/roles/:id',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedListPage } = await import('./pages/Users/ListPage');

      return ProtectedListPage;
    },
    to: '/settings/users',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedEditPage } = await import('./pages/Users/EditPage');

      return ProtectedEditPage;
    },
    to: '/settings/users/:id',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedCreatePage } = await import('./pages/Webhooks/CreatePage');

      return ProtectedCreatePage;
    },
    to: '/settings/webhooks/create',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedEditPage } = await import('./pages/Webhooks/EditPage');

      return ProtectedEditPage;
    },
    to: '/settings/webhooks/:id',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedListPage } = await import('./pages/Webhooks/ListPage');

      return ProtectedListPage;
    },
    to: '/settings/webhooks',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedListView } = await import('./pages/ApiTokens/ListView');

      return ProtectedListView;
    },
    to: '/settings/api-tokens',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedCreateView } = await import('./pages/ApiTokens/CreateView');

      return ProtectedCreateView;
    },
    to: '/settings/api-tokens/create',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedEditView } = await import('./pages/ApiTokens/EditView/EditViewPage');

      return ProtectedEditView;
    },
    to: '/settings/api-tokens/:id',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedCreateView } = await import('./pages/TransferTokens/CreateView');

      return ProtectedCreateView;
    },
    to: '/settings/transfer-tokens/create',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedListView } = await import('./pages/TransferTokens/ListView');

      return ProtectedListView;
    },
    to: '/settings/transfer-tokens',
    exact: true,
  },
  {
    async Component() {
      const { ProtectedEditView } = await import('./pages/TransferTokens/EditView');

      return ProtectedEditView;
    },
    to: '/settings/transfer-tokens/:id',
    exact: true,
  },
  {
    async Component() {
      const { PurchaseAuditLogs } = await import('./pages/PurchaseAuditLogs');

      return PurchaseAuditLogs;
    },
    to: '/settings/purchase-audit-logs',
    exact: true,
  },
  {
    async Component() {
      const { PurchaseReviewWorkflows } = await import('./pages/PurchaseReviewWorkflows');

      return PurchaseReviewWorkflows;
    },
    to: '/settings/purchase-review-workflows',
    exact: true,
  },
  {
    async Component() {
      const { PurchaseSingleSignOn } = await import('./pages/PurchaseSingleSignOn');

      return PurchaseSingleSignOn;
    },
    to: '/settings/purchase-single-sign-on',
    exact: true,
  },
];
