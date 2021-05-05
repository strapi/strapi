import RolesCreatePage from 'ee_else_ce/containers/Roles/CreatePage';
import ProtectedRolesListPage from 'ee_else_ce/containers/Roles/ProtectedListPage';
import ApplicationInfosPage from '../../ApplicationInfosPage';
import UsersEditPage from '../../Users/ProtectedEditPage';
import UsersListPage from '../../Users/ProtectedListPage';
import RolesEditPage from '../../Roles/ProtectedEditPage';
import WebhooksCreateView from '../../Webhooks/ProtectedCreateView';
import WebhooksEditView from '../../Webhooks/ProtectedEditView';
import WebhooksListView from '../../Webhooks/ProtectedListView';

const defaultRoutes = [
  {
    Component: ApplicationInfosPage,
    to: '/settings/application-infos',
    exact: true,
  },
  {
    Component: ProtectedRolesListPage,
    to: '/settings/roles',
    exact: true,
  },
  {
    Component: RolesCreatePage,
    to: '/settings/roles/duplicate/:id',
    exact: true,
  },
  {
    Component: RolesCreatePage,
    to: '/settings/roles/new',
    exact: true,
  },
  {
    Component: RolesEditPage,
    to: '/settings/roles/:id',
    exact: true,
  },
  {
    Component: UsersListPage,
    to: '/settings/users',
    exact: true,
  },
  {
    Component: UsersEditPage,
    to: '/settings/users/:id',
    exact: true,
  },
  {
    Component: WebhooksCreateView,
    to: '/settings/webhooks/create',
    exact: true,
  },
  {
    Component: WebhooksEditView,
    to: '/settings/webhooks/:id',
    exact: true,
  },
  {
    Component: WebhooksListView,
    to: '/settings/webhooks',
    exact: true,
  },
];

export default defaultRoutes;
