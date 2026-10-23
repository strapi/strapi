import type { Data, Modules } from '@strapi/types';
import type { WeeklyMetrics } from '../services/metrics';

/**
 * The `validation` service: the workflow and stage limits of the license, and the checks that apply
 * them. A check that fails throws a `ValidationError`.
 */
export type ValidationService = {
  /**
   * The maximum number of workflows and of stages per workflow, `200` each by default.
   * {@link ValidationService.register} freezes them: a later write throws.
   *
   * @internal
   */
  limits: { numberOfWorkflows: number; stagesPerWorkflow: number };
  /**
   * Sets the limits from the license options, each clamped between `1` and `200`, then freezes
   * them. A falsy limit keeps the default. Later calls do nothing.
   *
   * @internal
   */
  register(limits: { numberOfWorkflows: number; stagesPerWorkflow: number }): void;
  /**
   * Throws a `ValidationError` when a workflow has no stages, more stages than the limit, or two
   * stages with the same name.
   *
   * @internal
   */
  validateWorkflowStages(stages: { name: string }[] | undefined): void;
  /**
   * Rejects with a `ValidationError` when the stages of a workflow, plus `countAddedStages`, exceed
   * the limit.
   *
   * @internal
   */
  validateWorkflowCountStages(workflowId: Data.ID, countAddedStages?: number): Promise<void>;
  /**
   * Rejects with a `ValidationError` when the workflows, plus `countAddedWorkflows`, exceed the
   * limit.
   *
   * @internal
   */
  validateWorkflowCount(countAddedWorkflows?: number): Promise<void>;
};

/**
 * The `document-service-middlewares` service: the Document Service middlewares that the plugin
 * registers at bootstrap to keep the stage of entries in their workflow.
 */
export type DocumentServiceMiddlewaresService = {
  /**
   * On `create` and `clone`, assigns the first stage of the content type's workflow to an entry
   * that has no stage.
   *
   * @internal
   */
  assignStageOnCreate: Modules.Documents.Middleware.Middleware;
  /**
   * On `update`, emits `review-workflows.updateEntryStage` when the update moved the entry to
   * another stage. A `null` or missing stage is removed from the data.
   *
   * @internal
   */
  handleStageOnUpdate: Modules.Documents.Middleware.Middleware;
  /**
   * On `publish`, throws a `ValidationError` when the workflow requires a stage to publish and the
   * entry is at another stage.
   *
   * @internal
   */
  checkStageBeforePublish: Modules.Documents.Middleware.Middleware;
};

/**
 * The `workflow-metrics` service: the telemetry events of the plugin. Each `send*` member forwards
 * one event to `strapi.telemetry`, which drops it when telemetry is disabled. Only
 * {@link WorkflowMetricsService.sendDidSendReviewWorkflowPropertiesOnceAWeek} waits for the send.
 */
export type WorkflowMetricsService = {
  /**
   * Sends `didCreateStage`.
   *
   * @internal
   */
  sendDidCreateStage(): Promise<void>;
  /**
   * Sends `didEditStage`.
   *
   * @internal
   */
  sendDidEditStage(): Promise<void>;
  /**
   * Sends `didDeleteStage`.
   *
   * @internal
   */
  sendDidDeleteStage(): Promise<void>;
  /**
   * Sends `didChangeEntryStage`.
   *
   * @internal
   */
  sendDidChangeEntryStage(): Promise<void>;
  /**
   * Sends `didCreateWorkflow` with the ID of the new workflow and whether it requires a stage to
   * publish.
   *
   * @internal
   */
  sendDidCreateWorkflow(workflowId: Data.ID, hasRequiredStageToPublish: boolean): Promise<void>;
  /**
   * Sends `didEditWorkflow` with the ID of the workflow and whether the update sets a stage required
   * to publish.
   *
   * @internal
   */
  sendDidEditWorkflow(workflowId: Data.ID, hasRequiredStageToPublish: boolean): Promise<void>;
  /**
   * Sends the weekly workflow metrics as group properties.
   *
   * @internal
   */
  sendDidSendReviewWorkflowPropertiesOnceAWeek(metrics: WeeklyMetrics): Promise<void>;
  /**
   * Sends `didEditAssignee` with the admin user IDs of the previous and the new assignee, `null`
   * when there is none.
   *
   * @internal
   */
  sendDidEditAssignee(fromId: Data.ID | null, toId: Data.ID | null): Promise<void>;
};

/**
 * The `workflow-weekly-metrics` service: the weekly cron that sends the workflow metrics. Its
 * schedule is stored in the `plugin_ee_metrics` core store row.
 */
export type WorkflowWeeklyMetricsService = {
  /**
   * Counts the workflows, their stages and their content types. Without workflows,
   * `avgStagesCount` is `NaN` and `maxStagesCount` is `undefined`.
   *
   * @internal
   */
  computeMetrics(): Promise<WeeklyMetrics>;
  /**
   * Sends the computed metrics, then stores the time of the send as `lastWeeklyUpdate`.
   *
   * @internal
   */
  sendMetrics(): Promise<void>;
  /**
   * Resolves the stored cron schedule (six fields, starting with seconds). Stores a new weekly
   * schedule, starting 15 seconds from now, when none is stored or the last send is missing or more
   * than a week old.
   *
   * @internal
   */
  ensureWeeklyStoredCronSchedule(): Promise<string>;
  /**
   * Adds the `reviewWorkflowsWeekly` cron job, which calls
   * {@link WorkflowWeeklyMetricsService.sendMetrics} on the schedule from
   * {@link WorkflowWeeklyMetricsService.ensureWeeklyStoredCronSchedule}.
   *
   * @internal
   */
  registerCron(): Promise<void>;
};
