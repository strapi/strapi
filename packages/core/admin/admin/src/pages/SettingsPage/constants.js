export const ROUTES_CE = [
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "admin-roles-list" */ './pages/Roles/ProtectedListPage'
      );

      return component;
    },
    to: 'roles',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "admin-edit-roles-page" */ './pages/Roles/CreatePage'
      );

      return component;
    },
    to: 'roles/duplicate/:id',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "admin-edit-roles-page" */ './pages/Roles/CreatePage'
      );

      return component;
    },
    to: 'roles/new',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "admin-edit-roles-page" */ './pages/Roles/ProtectedEditPage'
      );

      return component;
    },
    to: 'roles/:id',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "admin-users" */ './pages/Users/ProtectedListPage'
      );

      return component;
    },
    to: 'users',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "admin-edit-users" */ './pages/Users/ProtectedEditPage'
      );

      return component;
    },
    to: 'users/:id',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "webhook-edit-page" */ './pages/Webhooks/ProtectedCreateView'
      );

      return component;
    },
    to: 'webhooks/create',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "webhook-edit-page" */ './pages/Webhooks/ProtectedEditView'
      );

      return component;
    },
    to: 'webhooks/:id',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "webhook-list-page" */ './pages/Webhooks/ProtectedListView'
      );

      return component;
    },
    to: 'webhooks',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "api-tokens-list-page" */ './pages/ApiTokens/ProtectedListView'
      );

      return component;
    },
    to: 'api-tokens',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "api-tokens-create-page" */ './pages/ApiTokens/ProtectedCreateView'
      );

      return component;
    },
    to: 'api-tokens/create',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "api-tokens-edit-page" */ './pages/ApiTokens/ProtectedEditView'
      );

      return component;
    },
    to: 'api-tokens/:id',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "transfer-tokens-create-page" */ './pages/TransferTokens/ProtectedCreateView'
      );

      return component;
    },
    to: 'transfer-tokens/create',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "transfer-tokens-list-page" */ './pages/TransferTokens/ProtectedListView'
      );

      return component;
    },
    to: 'transfer-tokens',
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "transfer-tokens-edit-page" */ './pages/TransferTokens/ProtectedEditView'
      );

      return component;
    },
    to: 'transfer-tokens/:id',
  },
];
