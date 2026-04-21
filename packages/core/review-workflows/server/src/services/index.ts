import workflows from './workflows';
import stages from './stages';
import stagePermissions from './stage-permissions';
import assignees from './assignees';
import reviewWorkflowsValidation from './validation';
import reviewWorkflowsMetrics from './metrics';
import reviewWorkflowsWeeklyMetrics from './metrics/weekly-metrics';
import documentServiceMiddleware from './document-service-middleware';
import homepage from '../homepage';

type ReviewWorkflowsServices = Record<string, unknown>;

const services: ReviewWorkflowsServices = {
  workflows,
  stages,
  'stage-permissions': stagePermissions,
  assignees,
  validation: reviewWorkflowsValidation,
  'document-service-middlewares': documentServiceMiddleware,
  'workflow-metrics': reviewWorkflowsMetrics,
  'workflow-weekly-metrics': reviewWorkflowsWeeklyMetrics,
  ...homepage.services,
};

export default services;
