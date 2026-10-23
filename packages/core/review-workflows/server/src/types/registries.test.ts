// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import type { Controllers } from './controllers';
import type {
  DocumentServiceMiddlewaresService,
  ValidationService,
  WorkflowMetricsService,
  WorkflowWeeklyMetricsService,
} from './services';

declare const context: Parameters<Core.ControllerHandler>[0];
declare const next: Parameters<Core.ControllerHandler>[1];

// Controllers only exist with the `review-workflows` feature.
strapi.controller('plugin::review-workflows.workflows')?.create(context, next);
strapi.plugin('review-workflows').controller('assignees')?.updateEntity(context, next);
strapi.controller('plugin::review-workflows.homepage')?.getRecentlyAssignedDocuments satisfies
  Core.ControllerHandler | undefined;
// @ts-expect-error The controller may be undefined.
strapi.controller('plugin::review-workflows.stages').find(context, next);
// @ts-expect-error Registered controllers have no arbitrary actions.
strapi.plugin('review-workflows').controller('stages')?.missing(context, next);

(() => ({
  // @ts-expect-error The factory is checked against the registered contract.
  getRecentlyAssignedDocuments: { data: [] },
})) satisfies Core.ControllerFactory<'plugin::review-workflows.homepage'>;

({
  type: 'admin',
  routes: [
    {
      method: 'PUT',
      path: '/content-manager/:model_uid/:id/stage',
      handler: 'stages.updateEntity',
      config: {
        middlewares: [(ctx: unknown, nextMiddleware: () => Promise<unknown>) => nextMiddleware()],
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['admin::review-workflows.read'] } },
        ],
      },
    },
  ],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::review-workflows'>;
({
  type: 'admin',
  // @ts-expect-error Route actions are checked against the controller contracts.
  routes: [{ method: 'GET', path: '/workflows', handler: 'workflows.findMany' }],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::review-workflows'>;
({
  type: 'admin',
  // @ts-expect-error `| undefined` registry entries have no actions: routes use `Controllers`.
  routes: [{ method: 'GET', path: '/workflows', handler: 'workflows.find' }],
}) satisfies Core.RouterInputFor<
  Core.RegisteredFor<Strapi.Registries.PackageControllers, 'plugin::review-workflows'>,
  'plugin::review-workflows'
>;

// Services only exist with the `review-workflows` feature.
strapi.service('plugin::review-workflows.validation') satisfies ValidationService | undefined;
strapi
  .plugin('review-workflows')
  .service('validation')
  ?.validateWorkflowStages([{ name: 'Draft' }]);
strapi.service('plugin::review-workflows.validation')?.validateWorkflowCountStages(1, 2);
strapi.plugin('review-workflows').service('document-service-middlewares') satisfies
  DocumentServiceMiddlewaresService | undefined;
const middlewares = strapi.service('plugin::review-workflows.document-service-middlewares');
if (middlewares !== undefined) {
  strapi.documents.use(middlewares.checkStageBeforePublish);
}
// @ts-expect-error The service may be undefined.
strapi.service('plugin::review-workflows.validation').validateWorkflowCount();
const validationService = strapi.plugin('review-workflows').service('validation');
// @ts-expect-error Stages are checked against the service contract.
validationService?.validateWorkflowStages([{ title: 'Draft' }]);
// @ts-expect-error Registered services have no arbitrary members.
strapi.service('plugin::review-workflows.document-service-middlewares')?.missing();

(() => ({
  limits: { numberOfWorkflows: 1, stagesPerWorkflow: 1 },
  register: () => undefined,
  validateWorkflowStages: () => undefined,
  validateWorkflowCountStages: () => Promise.resolve(),
  // @ts-expect-error The factory is checked against the registered contract.
  validateWorkflowCount: () => true,
})) satisfies Core.ServiceFactory<'plugin::review-workflows.validation'>;

strapi.service('plugin::review-workflows.workflow-metrics') satisfies
  WorkflowMetricsService | undefined;
const workflowMetrics = strapi.plugin('review-workflows').service('workflow-metrics');
workflowMetrics?.sendDidCreateWorkflow(1, false);
workflowMetrics?.sendDidEditWorkflow('1', true);
workflowMetrics?.sendDidEditAssignee(null, 2);
const weeklyMetrics = strapi.service('plugin::review-workflows.workflow-weekly-metrics');
weeklyMetrics satisfies WorkflowWeeklyMetricsService | undefined;
weeklyMetrics?.ensureWeeklyStoredCronSchedule() satisfies Promise<string> | undefined;
// @ts-expect-error Assignee IDs are checked against the service contract.
workflowMetrics?.sendDidEditAssignee(undefined, 2);
// @ts-expect-error Registered services have no arbitrary members.
weeklyMetrics?.sendWeeklyMetrics();

(() => ({
  computeMetrics: () =>
    Promise.resolve({
      numberOfActiveWorkflows: 0,
      avgStagesCount: 0,
      maxStagesCount: undefined,
      activatedContentTypes: 0,
    }),
  sendMetrics: () => Promise.resolve(),
  registerCron: () => Promise.resolve(),
  // @ts-expect-error The factory is checked against the registered contract.
  ensureWeeklyStoredCronSchedule: () => Promise.resolve(undefined),
})) satisfies Core.ServiceFactory<'plugin::review-workflows.workflow-weekly-metrics'>;
