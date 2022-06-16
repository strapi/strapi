import RolesCreatePage from 'ee_else_ce/pages/SettingsPage/pages/Roles/CreatePage';
import ProtectedRolesListPage from 'ee_else_ce/pages/SettingsPage/pages/Roles/ProtectedListPage';

const defaultRoutes = [
  {
    Component: () => {
      return { default: ProtectedRolesListPage };
    },

    to: '/settings/roles',
    exact: true,
  },
  {
    Component: () => {
      return { default: RolesCreatePage };
    },
    to: '/settings/roles/duplicate/:id',
    exact: true,
  },
  {
    Component: () => {
      return { default: RolesCreatePage };
    },
    to: '/settings/roles/new',
    exact: true,
  },
  {
    Component: async () => {
      const component = await import(
        /* webpackChunkName: "admin-edit-roles-page" */ '../pages/Roles/ProtectedEditPage'
      );

      return component;
    },
    to: '/settings/roles/:id',
    exact: true,
  },
  {
    Component: async () => {
      const component = await import(
        /* webpackChunkName: "admin-users" */ '../pages/Users/ProtectedListPage'
      );

      return component;
    },
    to: '/settings/users',
    exact: true,
  },
  {
    Component: async () => {
      const component = await import(
        /* webpackChunkName: "admin-edit-users" */ '../pages/Users/ProtectedEditPage'
      );

      return component;
    },
    to: '/settings/users/:id',
    exact: true,
  },
  {
    Component: async () => {
      const component = await import(
        /* webpackChunkName: "webhook-edit-page" */ '../pages/Webhooks/ProtectedCreateView'
      );

      return component;
    },
    to: '/settings/webhooks/create',
    exact: true,
  },
  {
    Component: async () => {
      const component = await import(
        /* webpackChunkName: "webhook-edit-page" */ '../pages/Webhooks/ProtectedEditView'
      );

      return component;
    },
    to: '/settings/webhooks/:id',
    exact: true,
  },
  {
    Component: async () => {
      const component = await import(
        /* webpackChunkName: "webhook-list-page" */ '../pages/Webhooks/ProtectedListView'
      );

      return component;
    },
    to: '/settings/webhooks',
    exact: true,
  },
  {
    Component: async () => {
      const component = await import(
        /* webpackChunkName: "webhook-list-page" */ '../pages/License/ProtectedPageView'
      );

      return component;
    },
    to: '/settings/license',
    exact: true,
  },
  {
    Component: async () => {
      const component = await import(
        /* webpackChunkName: "api-tokens-list-page" */ '../pages/ApiTokens/ProtectedListView'
      );

      return component;
    },
    to: '/settings/api-tokens',
    exact: true,
  },
  {
    Component: async () => {
      const component = await import(
        /* webpackChunkName: "api-tokens-create-page" */ '../pages/ApiTokens/ProtectedCreateView'
      );

      return component;
    },
    to: '/settings/api-tokens/create',
    exact: true,
  },
  {
    Component: async () => {
      const component = await import(
        /* webpackChunkName: "api-tokens-edit-page" */ '../pages/ApiTokens/ProtectedEditView'
      );

      return component;
    },
    to: '/settings/api-tokens/:id',
    exact: true,
  },
];

export default defaultRoutes;
