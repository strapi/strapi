import type { Data, Modules } from '@strapi/types';

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
