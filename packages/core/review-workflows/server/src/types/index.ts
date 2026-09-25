import type createAssigneesService from '../services/assignees';
import type createDocumentServiceMiddlewaresService from '../services/document-service-middleware';
import type MetricsService from '../services/metrics';
import type createWeeklyMetricsService from '../services/metrics/weekly-metrics';
import type createStagePermissionsService from '../services/stage-permissions';
import type createStagesService from '../services/stages';
import type createValidationService from '../services/validation';
import type createWorkflowsService from '../services/workflows';
import type { createHomepageService } from '../homepage/services/homepage';

/** Review Workflows services by name, as registered by the plugin. */
export type Services = {
  assignees: ReturnType<typeof createAssigneesService>;
  'document-service-middlewares': ReturnType<typeof createDocumentServiceMiddlewaresService>;
  homepage: ReturnType<typeof createHomepageService>;
  'stage-permissions': ReturnType<typeof createStagePermissionsService>;
  stages: ReturnType<typeof createStagesService>;
  validation: ReturnType<typeof createValidationService>;
  'workflow-metrics': typeof MetricsService;
  'workflow-weekly-metrics': ReturnType<typeof createWeeklyMetricsService>;
  workflows: ReturnType<typeof createWorkflowsService>;
};

/**
 * Default contracts loaded with the Review Workflows server types.
 * The services are only registered when the `review-workflows` EE feature is enabled.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::review-workflows.assignees': Services['assignees'];
        'plugin::review-workflows.document-service-middlewares': Services['document-service-middlewares'];
        'plugin::review-workflows.homepage': Services['homepage'];
        'plugin::review-workflows.stage-permissions': Services['stage-permissions'];
        'plugin::review-workflows.stages': Services['stages'];
        'plugin::review-workflows.validation': Services['validation'];
        'plugin::review-workflows.workflow-metrics': Services['workflow-metrics'];
        'plugin::review-workflows.workflow-weekly-metrics': Services['workflow-weekly-metrics'];
        'plugin::review-workflows.workflows': Services['workflows'];
      }
    }
  }
}
