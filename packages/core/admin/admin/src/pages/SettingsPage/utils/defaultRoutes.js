import RolesCreatePage from 'ee_else_ce/pages/SettingsPage/pages/Roles/CreatePage';
import ProtectedRolesListPage from 'ee_else_ce/pages/SettingsPage/pages/Roles/ProtectedListPage';

const defaultRoutes = [
  {
    Component() {
      return { default: ProtectedRolesListPage };
    },

    to: '/settings/roles',
    exact: true,
  },
  {
    Component() {
      return { default: RolesCreatePage };
    },
    to: '/settings/roles/duplicate/:id',
    exact: true,
  },
  {
    Component() {
      return { default: RolesCreatePage };
    },
    to: '/settings/roles/new',
    exact: true,
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "admin-edit-roles-page" */ '../pages/Roles/ProtectedEditPage'
      );

      return component;
    },
    to: '/settings/roles/:id',
    exact: true,
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "admin-users" */ '../pages/Users/ProtectedListPage'
      );

      return component;
    },
    to: '/settings/users',
    exact: true,
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "admin-edit-users" */ '../pages/Users/ProtectedEditPage'
      );

      return component;
    },
    to: '/settings/users/:id',
    exact: true,
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "webhook-edit-page" */ '../pages/Webhooks/ProtectedCreateView'
      );

      return component;
    },
    to: '/settings/webhooks/create',
    exact: true,
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "webhook-edit-page" */ '../pages/Webhooks/ProtectedEditView'
      );

      return component;
    },
    to: '/settings/webhooks/:id',
    exact: true,
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "webhook-list-page" */ '../pages/Webhooks/ProtectedListView'
      );

      return component;
    },
    to: '/settings/webhooks',
    exact: true,
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "api-tokens-list-page" */ '../pages/ApiTokens/ProtectedListView'
      );

      return component;
    },
    to: '/settings/api-tokens',
    exact: true,
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "api-tokens-create-page" */ '../pages/ApiTokens/ProtectedCreateView'
      );

      return component;
    },
    to: '/settings/api-tokens/create',
    exact: true,
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "api-tokens-edit-page" */ '../pages/ApiTokens/ProtectedEditView'
      );

      return component;
    },
    to: '/settings/api-tokens/:id',
    exact: true,
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "transfer-tokens-create-page" */ '../pages/TransferTokens/ProtectedCreateView'
      );

      return component;
    },
    to: '/settings/transfer-tokens/create',
    exact: true,
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "transfer-tokens-list-page" */ '../pages/TransferTokens/ProtectedListView'
      );

      return component;
    },
    to: '/settings/transfer-tokens',
    exact: true,
  },
  {
    async Component() {
      const component = await import(
        /* webpackChunkName: "transfer-tokens-edit-page" */ '../pages/TransferTokens/ProtectedEditView'
      );

      return component;
    },
    to: '/settings/transfer-tokens/:id',
    exact: true,
  },
];

export default defaultRoutes;
