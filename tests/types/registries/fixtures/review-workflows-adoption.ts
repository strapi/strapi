import type { Core } from '@strapi/strapi';
import type {
  AssigneesService,
  Controllers,
  DocumentServiceMiddlewaresService,
  HomepageController,
  HomepageService,
  StagePermissionsService,
  StagesController,
  StagesService,
  ValidationService,
  WorkflowWeeklyMetricsService,
} from '@strapi/review-workflows/strapi-server';

declare const app: Core.Strapi;
declare const context: Parameters<Core.ControllerHandler>[0];
declare const next: Parameters<Core.ControllerHandler>[1];

// Review Workflows controllers only exist with the `review-workflows` feature.
app.plugin('review-workflows').controller('workflows')?.update(context, next);
app.controller('plugin::review-workflows.assignees')?.updateEntity(context, next);
const stages = app.plugin('review-workflows').controller('stages');
stages satisfies StagesController | undefined;
const homepage = app.controller('plugin::review-workflows.homepage');
homepage satisfies HomepageController | undefined;
// @ts-expect-error Registry controller actions do not accept misspelled names.
app.controller('plugin::review-workflows.workflows')?.updates(context, next);

({
  type: 'admin',
  routes: [{ method: 'GET', path: '/workflows/:workflow_id/stages', handler: 'stages.find' }],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::review-workflows'>;
({
  type: 'admin',
  // @ts-expect-error Route actions are checked against the controller contracts.
  routes: [{ method: 'GET', path: '/workflows/:workflow_id/stages', handler: 'stages.findAll' }],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::review-workflows'>;

// Review Workflows services only exist with the `review-workflows` feature.
const validation = app.plugin('review-workflows').service('validation');
validation satisfies ValidationService | undefined;
validation?.limits.numberOfWorkflows satisfies number | undefined;
app.service('plugin::review-workflows.document-service-middlewares') satisfies
  DocumentServiceMiddlewaresService | undefined;
// @ts-expect-error Stages are checked against the service contract.
validation?.validateWorkflowStages('Draft');
app.service('plugin::review-workflows.workflow-weekly-metrics') satisfies
  WorkflowWeeklyMetricsService | undefined;
const schedule = app
  .plugin('review-workflows')
  .service('workflow-weekly-metrics')
  ?.ensureWeeklyStoredCronSchedule();
schedule satisfies Promise<string> | undefined;
// @ts-expect-error Workflow IDs are checked against the service contract.
app.service('plugin::review-workflows.workflow-metrics')?.sendDidCreateWorkflow({ id: 1 }, false);
app.plugin('review-workflows').service('stage-permissions') satisfies
  StagePermissionsService | undefined;
app.service('plugin::review-workflows.assignees') satisfies AssigneesService | undefined;
app.service('plugin::review-workflows.homepage') satisfies HomepageService | undefined;
const canTransition = app
  .service('plugin::review-workflows.stage-permissions')
  ?.can('admin::review-workflows.stage.transition', undefined);
canTransition satisfies boolean | undefined;
// @ts-expect-error Stage IDs are checked against the service contract.
app.plugin('review-workflows').service('stage-permissions')?.canTransitionToStage('2');
app.service('plugin::review-workflows.stages') satisfies StagesService | undefined;
const stageCount = app.plugin('review-workflows').service('stages')?.count({ workflowId: 1 });
stageCount satisfies Promise<number> | undefined;
// @ts-expect-error Stage IDs are checked against the service contract.
app.service('plugin::review-workflows.stages')?.findById({ id: 1 });
