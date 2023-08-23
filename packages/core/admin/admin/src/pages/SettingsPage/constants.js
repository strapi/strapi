import * as React from 'react';

export const SETTINGS_ROUTES_CE = [
  {
    Component: React.lazy(() =>
      import(/* webpackChunkName: "admin-roles-list" */ './pages/Roles/ProtectedListPage')
    ),
    path: '/settings/roles',
  },
  {
    Component: React.lazy(() =>
      import(/* webpackChunkName: "admin-edit-roles-page" */ './pages/Roles/CreatePage')
    ),
    path: '/settings/roles/duplicate/:id',
  },
  {
    Component: React.lazy(() =>
      import(/* webpackChunkName: "admin-edit-roles-page" */ './pages/Roles/CreatePage')
    ),
    path: '/settings/roles/new',
  },
  {
    Component: React.lazy(() =>
      import(/* webpackChunkName: "admin-edit-roles-page" */ './pages/Roles/ProtectedEditPage')
    ),
    path: '/settings/roles/:id',
  },
  {
    Component: React.lazy(() =>
      import(/* webpackChunkName: "admin-users" */ './pages/Users/ProtectedListPage')
    ),
    path: '/settings/users',
  },
  {
    Component: React.lazy(() =>
      import(/* webpackChunkName: "admin-edit-users" */ './pages/Users/ProtectedEditPage')
    ),
    path: '/settings/users/:id',
  },
  {
    Component: React.lazy(() =>
      import(/* webpackChunkName: "webhook-edit-page" */ './pages/Webhooks/ProtectedCreateView')
    ),
    path: '/settings/webhooks/create',
  },
  {
    Component: React.lazy(() =>
      import(/* webpackChunkName: "webhook-edit-page" */ './pages/Webhooks/ProtectedEditView')
    ),
    path: '/settings/webhooks/:id',
  },
  {
    Component: React.lazy(() =>
      import(/* webpackChunkName: "webhook-list-page" */ './pages/Webhooks/ProtectedListView')
    ),
    path: '/settings/webhooks',
  },
  {
    Component: React.lazy(() =>
      import(/* webpackChunkName: "api-tokens-list-page" */ './pages/ApiTokens/ProtectedListView')
    ),
    path: '/settings/api-tokens',
  },
  {
    Component: React.lazy(() =>
      import(
        /* webpackChunkName: "api-tokens-create-page" */ './pages/ApiTokens/ProtectedCreateView'
      )
    ),
    path: '/settings/api-tokens/create',
  },
  {
    Component: React.lazy(() =>
      import(/* webpackChunkName: "api-tokens-edit-page" */ './pages/ApiTokens/ProtectedEditView')
    ),
    path: '/settings/api-tokens/:id',
  },
  {
    Component: React.lazy(() =>
      import(
        /* webpackChunkName: "transfer-tokens-create-page" */ './pages/TransferTokens/ProtectedCreateView'
      )
    ),
    path: '/settings/transfer-tokens/create',
  },
  {
    Component: React.lazy(() =>
      import(
        /* webpackChunkName: "transfer-tokens-list-page" */ './pages/TransferTokens/ProtectedListView'
      )
    ),
    path: '/settings/transfer-tokens',
  },
  {
    Component: React.lazy(() =>
      import(
        /* webpackChunkName: "transfer-tokens-edit-page" */ './pages/TransferTokens/ProtectedEditView'
      )
    ),
    path: '/settings/transfer-tokens/:id',
  },
];
