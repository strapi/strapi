import auth from '../services/auth';
import role from '../services/role';
import user from '../services/user';
import passport from '../services/passport';
import metrics from '../services/metrics';
import * as permission from '../services/permission';
import * as contentType from '../services/content-type';
import * as token from '../services/token';
import * as apiToken from '../services/api-token';
import * as projectSettings from '../services/project-settings';
import * as transfer from '../services/transfer';

type S = {
  role: typeof role;
  user: typeof user;
  passport: typeof passport;
  permission: typeof permission;
  'content-type': typeof contentType;
  token: typeof token;
  auth: typeof auth;
  metrics: typeof metrics;
  'api-token': typeof apiToken;
  'project-settings': typeof projectSettings;
  transfer: typeof transfer;
};

type Resolve<T> = T extends (...args: unknown[]) => unknown ? T : { [K in keyof T]: T[K] };

export function getService<T extends keyof S>(name: T): Resolve<S[T]>;
