import * as userspermissions from '../services/UsersPermissions';
import * as user from '../services/User';
import * as jwt from '../services/Jwt';

type S = {
  userspermissions: typeof userspermissions;
  user: typeof user;
  jwt: typeof jwt;
};

export function getService<T extends keyof S>(name: T): S[T];
