// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Core } from '@strapi/types';
import type { Controllers } from './controllers';
import type {
  AssigneesService,
  DocumentServiceMiddlewaresService,
  HomepageService,
  PopulatedStageRow,
  StagePermissionsService,
  StagesService,
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

strapi.service('plugin::review-workflows.stage-permissions') satisfies
  StagePermissionsService | undefined;
const stagePermissions = strapi.plugin('review-workflows').service('stage-permissions');
stagePermissions?.can('admin::review-workflows.stage.transition', undefined) satisfies
  boolean | undefined;
stagePermissions
  ?.registerTo({
    roleId: 1,
    action: 'admin::review-workflows.stage.transition',
    toStage: 2,
  })
  .then((permissions) => permissions.map((permission) => permission.actionParameters.to));
stagePermissions?.unregister([{ id: 1 }]) satisfies Promise<void> | undefined;
strapi.plugin('review-workflows').service('assignees') satisfies AssigneesService | undefined;
const assignees = strapi.service('plugin::review-workflows.assignees');
assignees?.findEntityAssigneeId(1, 'api::article.article') satisfies
  Promise<number | null> | undefined;
assignees?.updateEntityAssignee(
  { id: 1, documentId: 'abc', locale: null, updatedAt: '2026-01-01T00:00:00.000Z' },
  'api::article.article',
  2
);
strapi.service('plugin::review-workflows.homepage') satisfies HomepageService | undefined;
// @ts-expect-error Stage IDs are checked against the service contract.
stagePermissions?.canTransitionToStage('2');
stagePermissions
  ?.register({
    roleId: 1,
    action: 'admin::review-workflows.stage.transition',
    fromStage: 1,
  })
  .then((permissions) =>
    permissions.map(
      (permission) =>
        // @ts-expect-error A "from" permission has no "to" stage.
        permission.actionParameters.to
    )
  );
// @ts-expect-error Registered services have no arbitrary members.
strapi.service('plugin::review-workflows.homepage')?.getRecentDocuments();

(() => ({
  findEntityAssigneeId: () => Promise.resolve(null),
  // @ts-expect-error The factory is checked against the registered contract.
  updateEntityAssignee: () => Promise.resolve(true),
})) satisfies Core.ServiceFactory<'plugin::review-workflows.assignees'>;

strapi.service('plugin::review-workflows.stages') satisfies StagesService | undefined;
const stages = strapi.plugin('review-workflows').service('stages');
stages?.findById(1, {
  workflowId: '2',
  populate: { permissions: { populate: ['role'] } },
}) satisfies Promise<PopulatedStageRow | null> | undefined;
stages
  ?.createMany([{ name: 'Draft', fromPermissions: [{ role: 1, action: 'transition' }] }])
  .then((created) => created.map((stage) => stage.name));
stages?.replaceStages([], [{ name: 'Draft' }], ['api::article.article']);
stages?.updateEntitiesStage('api::article.article', { fromStageId: null, toStageId: 1 });
stages?.createMany([{ name: 'Draft' }], { fields: ['id'] }).then((created) =>
  created.map(
    (stage) =>
      // @ts-expect-error Only the selected fields are resolved.
      stage.name
  )
);
// @ts-expect-error Content type UIDs are checked against the service contract.
stages?.deleteAllEntitiesStage('article');
// @ts-expect-error Stages to create are checked against the service contract.
stages?.createMany([{ title: 'Draft' }]);
// @ts-expect-error Registered services have no arbitrary members.
strapi.service('plugin::review-workflows.stages')?.findAll();

declare const stagesContract: StagesService;
(() => ({
  ...stagesContract,
  // @ts-expect-error The factory is checked against the registered contract.
  count: () => Promise.resolve('1'),
})) satisfies Core.ServiceFactory<'plugin::review-workflows.stages'>;
