import * as usersPermissions from '../services/users-permissions';
import * as user from '../services/user';
import * as role from '../services/role';
import * as jwt from '../services/jwt';
import * as providers from '../services/providers';
import * as providersRegistry from '../services/providers-registry';
import * as permission from '../services/permission';

type S = {
  ['users-permissions']: typeof usersPermissions;
  ['role']: typeof role;
  user: typeof user;
  jwt: typeof jwt;
  providers: typeof providers;
  ['providers-registry']: typeof providersRegistry;
  permission: typeof permission;
};

export function getService<T extends keyof S>(name: T): ReturnType<S[T]>;
