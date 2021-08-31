import * as role from '../services/role';
import * as user from '../services/user';
import * as permission from '../services/permission';
import * as contentType from '../services/content-type';
import * as metrics from '../services/metrics';
import * as token from '../services/token';
import * as auth from '../services/auth';

type S = {
  role: typeof role;
  user: typeof user;
  permission: typeof permission;
  ['content-type']: typeof contentType;
  token: typeof token;
  auth: typeof auth;
  metrics: typeof metrics;
};

export function getService<T extends keyof S>(name: T): ReturnType<S[T]>;
