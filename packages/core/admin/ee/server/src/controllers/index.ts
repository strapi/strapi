import type {} from 'koa-body';

import authentication from './authentication';
import role from './role';
import user from './user';
import admin from './admin';

export default {
  authentication,
  role,
  user,
  admin,
};
