import workflows from './workflows';
import stages from './stages';
import stagePermissions from './stage-permissions';
import assignees from './assignees';
import reviewWorkflowsValidation from './validation';
import reviewWorkflowsDecorator from './entity-service-decorator';
import reviewWorkflowsMetrics from './metrics';
import reviewWorkflowsWeeklyMetrics from './metrics/weekly-metrics';

export default {
  workflows,
  stages,
  'stage-permissions': stagePermissions,
  assignees,
  validation: reviewWorkflowsValidation,
  'review-workflows-decorator': reviewWorkflowsDecorator,
  'workflow-metrics': reviewWorkflowsMetrics,
  'workflow-weekly-metrics': reviewWorkflowsWeeklyMetrics,
};
