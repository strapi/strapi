export const ROUTES_CE = [
  {
    async Component() {
      const component = await import('./pages/Roles/ProtectedListPage');

      return component;
    },
    to: '/settings/roles',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/Roles/CreatePage');

      return component;
    },
    to: '/settings/roles/duplicate/:id',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/Roles/CreatePage');

      return component;
    },
    to: '/settings/roles/new',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/Roles/ProtectedEditPage');

      return component;
    },
    to: '/settings/roles/:id',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/Users/ProtectedListPage');

      return component;
    },
    to: '/settings/users',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/Users/ProtectedEditPage');

      return component;
    },
    to: '/settings/users/:id',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/Webhooks/ProtectedCreateView');

      return component;
    },
    to: '/settings/webhooks/create',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/Webhooks/ProtectedEditView');

      return component;
    },
    to: '/settings/webhooks/:id',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/Webhooks/ProtectedListView');

      return component;
    },
    to: '/settings/webhooks',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/ApiTokens/ProtectedListView');

      return component;
    },
    to: '/settings/api-tokens',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/ApiTokens/ProtectedCreateView');

      return component;
    },
    to: '/settings/api-tokens/create',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/ApiTokens/ProtectedEditView');

      return component;
    },
    to: '/settings/api-tokens/:id',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/TransferTokens/ProtectedCreateView');

      return component;
    },
    to: '/settings/transfer-tokens/create',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/TransferTokens/ProtectedListView');

      return component;
    },
    to: '/settings/transfer-tokens',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/TransferTokens/ProtectedEditView');

      return component;
    },
    to: '/settings/transfer-tokens/:id',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/AuditLogs/SalesPage');

      return component;
    },
    to: '/settings/purchase-audit-logs',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/ReviewWorkflows/SalesPage');

      return component;
    },
    to: '/settings/purchase-review-workflows',
    exact: true,
  },
  {
    async Component() {
      const component = await import('./pages/SingleSignOn/SalesPage');

      return component;
    },
    to: '/settings/purchase-single-sign-on',
    exact: true,
  },
];
