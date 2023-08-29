import * as React from 'react';

export const SETTINGS_ROUTES_CE = [
  {
    component: React.lazy(() =>
      import(/* webpackChunkName: "admin-roles-list" */ './pages/Roles/ProtectedListPage')
    ),
    path: '/settings/roles',
  },
  {
    component: React.lazy(() =>
      import(/* webpackChunkName: "admin-edit-roles-page" */ './pages/Roles/CreatePage')
    ),
    path: '/settings/roles/duplicate/:id',
  },
  {
    component: React.lazy(() =>
      import(/* webpackChunkName: "admin-edit-roles-page" */ './pages/Roles/CreatePage')
    ),
    path: '/settings/roles/new',
  },
  {
    component: React.lazy(() =>
      import(/* webpackChunkName: "admin-edit-roles-page" */ './pages/Roles/ProtectedEditPage')
    ),
    path: '/settings/roles/:id',
  },
  {
    component: React.lazy(() =>
      import(/* webpackChunkName: "admin-users" */ './pages/Users/ProtectedListPage')
    ),
    path: '/settings/users',
  },
  {
    component: React.lazy(() =>
      import(/* webpackChunkName: "admin-edit-users" */ './pages/Users/ProtectedEditPage')
    ),
    path: '/settings/users/:id',
  },
  {
    component: React.lazy(() =>
      import(/* webpackChunkName: "webhook-edit-page" */ './pages/Webhooks/ProtectedCreateView')
    ),
    path: '/settings/webhooks/create',
  },
  {
    component: React.lazy(() =>
      import(/* webpackChunkName: "webhook-edit-page" */ './pages/Webhooks/ProtectedEditView')
    ),
    path: '/settings/webhooks/:id',
  },
  {
    component: React.lazy(() =>
      import(/* webpackChunkName: "webhook-list-page" */ './pages/Webhooks/ProtectedListView')
    ),
    path: '/settings/webhooks',
  },
  {
    component: React.lazy(() =>
      import(/* webpackChunkName: "api-tokens-list-page" */ './pages/ApiTokens/ProtectedListView')
    ),
    path: '/settings/api-tokens',
  },
  {
    component: React.lazy(() =>
      import(
        /* webpackChunkName: "api-tokens-create-page" */ './pages/ApiTokens/ProtectedCreateView'
      )
    ),
    path: '/settings/api-tokens/create',
  },
  {
    component: React.lazy(() =>
      import(/* webpackChunkName: "api-tokens-edit-page" */ './pages/ApiTokens/ProtectedEditView')
    ),
    path: '/settings/api-tokens/:id',
  },
  {
    component: React.lazy(() =>
      import(
        /* webpackChunkName: "transfer-tokens-create-page" */ './pages/TransferTokens/ProtectedCreateView'
      )
    ),
    path: '/settings/transfer-tokens/create',
  },
  {
    component: React.lazy(() =>
      import(
        /* webpackChunkName: "transfer-tokens-list-page" */ './pages/TransferTokens/ProtectedListView'
      )
    ),
    path: '/settings/transfer-tokens',
  },
  {
    component: React.lazy(() =>
      import(
        /* webpackChunkName: "transfer-tokens-edit-page" */ './pages/TransferTokens/ProtectedEditView'
      )
    ),
    path: '/settings/transfer-tokens/:id',
  },
];
