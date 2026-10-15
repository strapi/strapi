import jwt from './jwt';
import providers from './providers';
import user from './user';
import role from './role';
import usersPermissions from './users-permissions';
import providersRegistry from './providers-registry';
import permission from './permission';

export default {
  jwt,
  providers,
  'providers-registry': providersRegistry,
  role,
  user,
  'users-permissions': usersPermissions,
  permission,
};
