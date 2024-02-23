import auth from './auth';
import passport from './passport';
import role from './role';
import user from './user';
import metrics from './metrics';
import seatEnforcement from './seat-enforcement';
import workflows from './review-workflows/workflows';
import stages from './review-workflows/stages';
import stagePermissions from './review-workflows/stage-permissions';
import assignees from './review-workflows/assignees';
import reviewWorkflows from './review-workflows/review-workflows';
import reviewWorkflowsValidation from './review-workflows/validation';
import reviewWorkflowsDecorator from './review-workflows/entity-service-decorator';
import reviewWorkflowsMetrics from './review-workflows/metrics';
import reviewWorkflowsWeeklyMetrics from './review-workflows/metrics/weekly-metrics';

export default {
  auth,
  passport,
  role,
  user,
  metrics,
  'seat-enforcement': seatEnforcement,
  workflows,
  stages,
  'stage-permissions': stagePermissions,
  assignees,
  'review-workflows': reviewWorkflows,
  'review-workflows-validation': reviewWorkflowsValidation,
  'review-workflows-decorator': reviewWorkflowsDecorator,
  'review-workflows-metrics': reviewWorkflowsMetrics,
  'review-workflows-weekly-metrics': reviewWorkflowsWeeklyMetrics,
};
