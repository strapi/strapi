import type {} from 'koa-body';

import authentication from './authentication';
import role from './role';
import user from './user';
import auditLogs from './audit-logs';
import admin from './admin';

export default {
  authentication,
  role,
  user,
  auditLogs,
  admin,
};
