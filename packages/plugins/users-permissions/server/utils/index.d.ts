import * as usersPermissions from '../services/users-permissions';
import * as user from '../services/user';
import * as role from '../services/role';
import * as jwt from '../services/jwt';
import * as providers from '../services/providers';

type S = {
  ['users-permissions']: typeof usersPermissions;
  ['role']: typeof role;
  user: typeof user;
  jwt: typeof jwt;
  providers: typeof providers;
  ['providers-registry']: typeof providers;
};

export function getService<T extends keyof S>(name: T): ReturnType<S[T]>;
