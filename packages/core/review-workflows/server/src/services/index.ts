import type { Core } from '@strapi/types';
import type { Services } from '../types';

import workflows from './workflows';
import stages from './stages';
import stagePermissions from './stage-permissions';
import assignees from './assignees';
import reviewWorkflowsValidation from './validation';
import reviewWorkflowsMetrics from './metrics';
import reviewWorkflowsWeeklyMetrics from './metrics/weekly-metrics';
import documentServiceMiddleware from './document-service-middleware';
import homepage from '../homepage';

/** Names of the registered Review Workflows services. */
type RegisteredNames = keyof Core.RegisteredFor<
  Strapi.Registries.PackageServices,
  'plugin::review-workflows'
>;

export default {
  workflows,
  stages,
  'stage-permissions':
    stagePermissions satisfies Core.ServiceFactory<'plugin::review-workflows.stage-permissions'>,
  assignees: assignees satisfies Core.ServiceFactory<'plugin::review-workflows.assignees'>,
  validation:
    reviewWorkflowsValidation satisfies Core.ServiceFactory<'plugin::review-workflows.validation'>,
  'document-service-middlewares':
    documentServiceMiddleware satisfies Core.ServiceFactory<'plugin::review-workflows.document-service-middlewares'>,
  'workflow-metrics': reviewWorkflowsMetrics satisfies Services['workflow-metrics'],
  'workflow-weekly-metrics':
    reviewWorkflowsWeeklyMetrics satisfies Core.ServiceFactory<'plugin::review-workflows.workflow-weekly-metrics'>,
  ...homepage.services,
} satisfies Record<RegisteredNames, unknown>;
