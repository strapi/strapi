import workflows from './workflows';
import stages from './stages';
import stagePermissions from './stage-permissions';
import assignees from './assignees';
import reviewWorkflowsValidation from './validation';
import reviewWorkflowsMetrics from './metrics';
import reviewWorkflowsWeeklyMetrics from './metrics/weekly-metrics';
import documentServiceMiddleware from './document-service-middleware';

export default {
  workflows,
  stages,
  'stage-permissions': stagePermissions,
  assignees,
  validation: reviewWorkflowsValidation,
  'document-service-middlewares': documentServiceMiddleware,
  'workflow-metrics': reviewWorkflowsMetrics,
  'workflow-weekly-metrics': reviewWorkflowsWeeklyMetrics,
};
