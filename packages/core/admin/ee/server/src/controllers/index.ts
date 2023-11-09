import 'koa-bodyparser';

import authentication from './authentication';
import role from './role';
import user from './user';
import auditLogs from './audit-logs';
import admin from './admin';
import workflows from './workflows';
import stages from './workflows/stages';
import assignees from './workflows/assignees';

export default {
  authentication,
  role,
  user,
  auditLogs,
  admin,
  workflows,
  stages,
  assignees,
};
