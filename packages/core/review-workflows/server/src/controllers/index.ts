import type {} from 'koa-body';

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
