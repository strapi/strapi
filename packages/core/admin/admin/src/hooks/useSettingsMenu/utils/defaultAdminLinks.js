import adminPermissions from '../../../permissions';

const defaultAdminLinks = [
  {
    intlLabel: { id: 'global.roles', defaultMessage: 'Roles' },
    to: '/settings/roles',
    id: 'roles',
    isDisplayed: false,
    permissions: adminPermissions.settings.roles.main,
  },
  {
    intlLabel: { id: 'global.users' },
    // Init the search params directly
    to: '/settings/users?pageSize=10&page=1&sort=firstname',
    id: 'users',
    isDisplayed: false,
    permissions: adminPermissions.settings.users.main,
  },
];

export default defaultAdminLinks;
