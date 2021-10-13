import RolesCreatePage from 'ee_else_ce/containers/Roles/CreatePage';
import ProtectedRolesListPage from 'ee_else_ce/containers/Roles/ProtectedListPage';
import { SETTINGS_BASE_URL } from '../../../config';
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
    to: `${SETTINGS_BASE_URL}/application-infos`,
    exact: true,
  },
  {
    Component: ProtectedRolesListPage,
    to: `${SETTINGS_BASE_URL}/roles`,
    exact: true,
  },
  {
    Component: RolesCreatePage,
    to: `${SETTINGS_BASE_URL}/roles/duplicate/:id`,
    exact: true,
  },
  {
    Component: RolesCreatePage,
    to: `${SETTINGS_BASE_URL}/roles/new`,
    exact: true,
  },
  {
    Component: RolesEditPage,
    to: `${SETTINGS_BASE_URL}/roles/:id`,
    exact: true,
  },
  {
    Component: UsersListPage,
    to: `${SETTINGS_BASE_URL}/users`,
    exact: true,
  },
  {
    Component: UsersEditPage,
    to: `${SETTINGS_BASE_URL}/users/:id`,
    exact: true,
  },
  {
    Component: WebhooksCreateView,
    to: `${SETTINGS_BASE_URL}/webhooks/create`,
    exact: true,
  },
  {
    Component: WebhooksEditView,
    to: `${SETTINGS_BASE_URL}/webhooks/:id`,
    exact: true,
  },
  {
    Component: WebhooksListView,
    to: `${SETTINGS_BASE_URL}/webhooks`,
    exact: true,
  },
];

export default defaultRoutes;
