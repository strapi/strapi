import type {} from 'koa-body';

import workflows from './workflows';
import stages from './stages';
import assignees from './assignees';
import homepage from '../homepage';

export default {
  workflows,
  stages,
  assignees,
  ...homepage.controllers,
};
