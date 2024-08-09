import type { RouteObject } from 'react-router-dom';

export const ROUTES_CE: RouteObject[] = [
  {
    lazy: async () => {
      const { ProtectedListPage } = await import('./pages/Roles/ListPage');

      return {
        Component: ProtectedListPage,
      };
    },
    path: 'roles',
  },
  {
    lazy: async () => {
      const { ProtectedCreatePage } = await import('./pages/Roles/CreatePage');

      return {
        Component: ProtectedCreatePage,
      };
    },
    path: 'roles/duplicate/:id',
  },
  {
    lazy: async () => {
      const { ProtectedCreatePage } = await import('./pages/Roles/CreatePage');

      return {
        Component: ProtectedCreatePage,
      };
    },
    path: 'roles/new',
  },
  {
    lazy: async () => {
      const { ProtectedEditPage } = await import('./pages/Roles/EditPage');

      return {
        Component: ProtectedEditPage,
      };
    },
    path: 'roles/:id',
  },
  {
    lazy: async () => {
      const { ProtectedListPage } = await import('./pages/Users/ListPage');

      return {
        Component: ProtectedListPage,
      };
    },
    path: 'users',
  },
  {
    lazy: async () => {
      const { ProtectedEditPage } = await import('./pages/Users/EditPage');

      return {
        Component: ProtectedEditPage,
      };
    },
    path: 'users/:id',
  },
  {
    lazy: async () => {
      const { ProtectedCreatePage } = await import('./pages/Webhooks/CreatePage');

      return {
        Component: ProtectedCreatePage,
      };
    },
    path: 'webhooks/create',
  },
  {
    lazy: async () => {
      const { ProtectedEditPage } = await import('./pages/Webhooks/EditPage');

      return {
        Component: ProtectedEditPage,
      };
    },
    path: 'webhooks/:id',
  },
  {
    lazy: async () => {
      const { ProtectedListPage } = await import('./pages/Webhooks/ListPage');

      return {
        Component: ProtectedListPage,
      };
    },
    path: 'webhooks',
  },
  {
    lazy: async () => {
      const { ProtectedListView } = await import('./pages/ApiTokens/ListView');

      return {
        Component: ProtectedListView,
      };
    },
    path: 'api-tokens',
  },
  {
    lazy: async () => {
      const { ProtectedCreateView } = await import('./pages/ApiTokens/CreateView');

      return {
        Component: ProtectedCreateView,
      };
    },
    path: 'api-tokens/create',
  },
  {
    lazy: async () => {
      const { ProtectedEditView } = await import('./pages/ApiTokens/EditView/EditViewPage');

      return {
        Component: ProtectedEditView,
      };
    },
    path: 'api-tokens/:id',
  },
  {
    lazy: async () => {
      const { ProtectedCreateView } = await import('./pages/TransferTokens/CreateView');

      return {
        Component: ProtectedCreateView,
      };
    },
    path: 'transfer-tokens/create',
  },
  {
    lazy: async () => {
      const { ProtectedListView } = await import('./pages/TransferTokens/ListView');

      return {
        Component: ProtectedListView,
      };
    },
    path: 'transfer-tokens',
  },
  {
    lazy: async () => {
      const { ProtectedEditView } = await import('./pages/TransferTokens/EditView');

      return {
        Component: ProtectedEditView,
      };
    },
    path: 'transfer-tokens/:id',
  },
  {
    lazy: async () => {
      const { ProtectedInstalledPlugins } = await import('./pages/InstalledPlugins');

      return {
        Component: ProtectedInstalledPlugins,
      };
    },
    path: 'list-plugins',
  },

  {
    lazy: async () => {
      const { PurchaseAuditLogs } = await import('./pages/PurchaseAuditLogs');

      return {
        Component: PurchaseAuditLogs,
      };
    },
    path: 'purchase-audit-logs',
  },
  {
    lazy: async () => {
      const { PurchaseSingleSignOn } = await import('./pages/PurchaseSingleSignOn');

      return {
        Component: PurchaseSingleSignOn,
      };
    },
    path: 'purchase-single-sign-on',
  },
];
