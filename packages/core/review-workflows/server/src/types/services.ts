import type { Data, Modules, UID } from '@strapi/types';
import type { queryParams } from '@strapi/utils';
import type { GetRecentlyAssignedDocuments } from '../../../shared/contracts/homepage';
import type { WeeklyMetrics } from '../services/metrics';
import type { StageWithPermissions } from '../services/stage-permissions';

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

/**
 * An admin permission that the `stage-permissions` service created for a stage: `from` lets a role
 * move entries out of the stage, `to` lets it move entries into the stage.
 */
export type RegisteredStagePermission<TDirection extends 'from' | 'to'> = {
  id: number;
  action: string;
  actionParameters: { [TKey in TDirection]: number };
  subject: string | null;
  properties: Record<string, unknown>;
  conditions: string[];
};

/**
 * The `stage-permissions` service: the stage transition permissions of admin roles. The checks
 * read the user of the current admin request: they return `false` outside a request, and `true`
 * for a super admin.
 */
export type StagePermissionsService = {
  /**
   * Creates the permission for a role to move entries out of `fromStage`. Rejects with an
   * `ApplicationError` when `action` is not the stage transition action.
   *
   * @internal
   */
  register(permission: {
    roleId: number;
    action: string;
    fromStage: number;
  }): Promise<RegisteredStagePermission<'from'>[]>;
  /**
   * Calls {@link StagePermissionsService.register} for each permission.
   *
   * @internal
   */
  registerMany(
    permissions: { roleId: number; action: string; fromStage: number }[]
  ): Promise<RegisteredStagePermission<'from'>[][]>;
  /**
   * Creates the permission for a role to move entries into `toStage`. Rejects with an
   * `ApplicationError` when `action` is not the stage transition action.
   *
   * @internal
   */
  registerTo(permission: {
    roleId: number;
    action: string;
    toStage: number;
  }): Promise<RegisteredStagePermission<'to'>[]>;
  /**
   * Calls {@link StagePermissionsService.registerTo} for each permission.
   *
   * @internal
   */
  registerManyTo(
    permissions: { roleId: number; action: string; toStage: number }[]
  ): Promise<RegisteredStagePermission<'to'>[][]>;
  /**
   * Deletes the permissions by ID.
   *
   * @internal
   */
  unregister(permissions: { id: number }[]): Promise<void>;
  /**
   * Whether the current user may run `action` on entries at `fromStage`. `fromStage` is
   * `undefined` for an entry without a stage.
   *
   * @internal
   */
  can(action: string, fromStage: number | undefined): boolean;
  /**
   * Whether the current user may move entries into the stage, read with its permissions.
   *
   * @internal
   */
  canTransitionToStage(toStageId: number): Promise<boolean>;
  /**
   * Whether the current user may move entries into a stage whose permissions are already populated
   * with their roles.
   *
   * @internal
   */
  canTransitionToStageWithPermissions(stage: StageWithPermissions): boolean;
};

/**
 * The `assignees` service: the admin user assigned to review an entry.
 */
export type AssigneesService = {
  /**
   * Resolves the admin user ID assigned to the entry with database ID `id`, `null` when there is
   * none.
   *
   * @internal
   */
  findEntityAssigneeId(id: Data.ID, model: UID.ContentType): Promise<number | null>;
  /**
   * Assigns the admin user `assigneeId` to the entry, or removes the assignee when it is `null`,
   * and keeps the entry's `updatedAt`. Rejects with an `ApplicationError` when the user does not
   * exist. Resolves the entry with its assignee populated.
   *
   * @internal
   */
  updateEntityAssignee(
    entityToUpdate: {
      id: Data.ID;
      documentId: string;
      /** `null` for a content type that is not localized. */
      locale: string | null;
      updatedAt: string;
    },
    model: UID.ContentType,
    assigneeId: Data.ID | null
  ): Promise<Modules.Documents.AnyDocument | null>;
};

/**
 * The `homepage` service: the data of the admin homepage widget.
 */
export type HomepageService = {
  /**
   * Resolves the last documents assigned to the user of the current admin request. Rejects outside
   * an admin request.
   *
   * @internal
   */
  getRecentlyAssignedDocuments(): Promise<GetRecentlyAssignedDocuments.Response['data']>;
};

/** A stage row as the database returns it, without its relations. */
export type StageRow = {
  id: number;
  documentId: string;
  name: string;
  color: string;
  /** Stages are not localized. */
  locale: null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
};

/** A transition permission of a stage, as the database returns it. */
export type StagePermissionRow = {
  id: number;
  documentId: string;
  action: string;
  /** `from` lets the role move entries out of the stage, `to` into it. */
  actionParameters: { from?: number; to?: number };
  subject: string | null;
  properties: Record<string, unknown>;
  conditions: string[];
  locale: null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  /** The admin role, present when populated. */
  role?: {
    id: number;
    documentId: string;
    name: string;
    code: string;
    description: string | null;
    locale: null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
};

/** A stage row with the relations that the read's `populate` asked for. */
export type PopulatedStageRow = StageRow & {
  permissions?: StagePermissionRow[];
  workflow?: {
    id: number;
    documentId: string;
    name: string;
    contentTypes: UID.ContentType[];
    locale: null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
};

/** A stage to create or update, as the workflow routes receive it. */
export type StageInput = {
  name: string;
  color?: string;
  workflow?: Data.ID;
  /** The roles that may move entries out of the stage. */
  fromPermissions?: { role: number; action: string }[];
  /** The roles that may move entries into the stage. */
  toPermissions?: { role: number; action: string }[];
};

/** A stage of a workflow read with its permissions and their roles. */
export type StoredStage = {
  id: number;
  name: string;
  color: string;
  permissions?: {
    id: number;
    action: string;
    actionParameters?: { from?: number; to?: number };
    /** The role ID, or the populated role. */
    role: number | { id: number };
  }[];
};

/**
 * The `stages` service: the stages of the workflows, their transition permissions, and the stage
 * of each entry.
 */
export type StagesService = {
  /**
   * Resolves the stages of a workflow.
   *
   * @internal
   */
  find(params: {
    workflowId: Data.ID;
    populate?: queryParams.Params['populate'];
  }): Promise<PopulatedStageRow[]>;
  /**
   * Resolves the stage with this ID, `null` when there is none. `workflowId` is ignored: the stage
   * can belong to any workflow.
   *
   * @internal
   */
  findById(
    id: Data.ID,
    params?: { workflowId?: Data.ID; populate?: queryParams.Params['populate'] }
  ): Promise<PopulatedStageRow | null>;
  /**
   * Creates the stages and their transition permissions. Resolves the created rows, with only the
   * `fields` when given.
   *
   * @internal
   */
  createMany<TField extends keyof StageRow = keyof StageRow>(
    stagesList: StageInput[],
    options?: { fields?: TField[] }
  ): Promise<Pick<StageRow, TField>[]>;
  /**
   * Updates `srcStage` with `destStage`. When `destStage` has `fromPermissions` or
   * `toPermissions`, replaces the transition permissions, keeping the stored ones of the other
   * direction. Resolves `null` when the stage does not exist.
   *
   * @internal
   */
  update(srcStage: StoredStage, destStage: StageInput & { id: number }): Promise<StageRow | null>;
  /**
   * Deletes the stage and its transition permissions. Resolves the deleted row, `null` when the
   * stage does not exist.
   *
   * @internal
   */
  delete(stage: { id: number; permissions?: { id: number }[] }): Promise<StageRow | null>;
  /**
   * Deletes the stages and their transition permissions.
   *
   * @internal
   */
  deleteMany(stages: { id: number; permissions?: { id: number }[] }[]): Promise<{ count: number }>;
  /**
   * Deletes the transition permissions of the stages.
   *
   * @internal
   */
  deleteStagePermissions(stages: { permissions?: { id: number }[] }[]): Promise<void>;
  /**
   * Counts the stages, of one workflow when `workflowId` is given.
   *
   * @internal
   */
  count(params?: { workflowId?: Data.ID }): Promise<number>;
  /**
   * Replaces the stages of a workflow: creates, updates and deletes stages to match `destStages`,
   * and moves the entries of the `contentTypesToMigrate` at a deleted stage to the nearest
   * remaining stage. Resolves `destStages` with the IDs of the created stages. Rejects with a
   * `ValidationError` when no stage would remain.
   *
   * @internal
   */
  replaceStages(
    srcStages: StoredStage[],
    destStages: (StageInput & { id?: number })[],
    contentTypesToMigrate?: UID.ContentType[]
  ): Promise<(StageInput & { id: number })[]>;
  /**
   * Moves the entry to the stage `stageId`, and keeps the entry's `updatedAt`. Rejects with an
   * `ApplicationError` when the stage does not exist. Resolves the entry with its stage populated.
   *
   * @internal
   */
  updateEntity(
    entityToUpdate: {
      id: Data.ID;
      documentId: string;
      /** `null` for a content type that is not localized. */
      locale: string | null;
      updatedAt: string;
    },
    model: UID.ContentType,
    stageId: Data.ID
  ): Promise<Modules.Documents.AnyDocument | null>;
  /**
   * Moves the entries of a content type to the stage `toStageId`: the entries at `fromStageId`,
   * the entries without a stage when it is `null`, or the entries with a stage when it is
   * `undefined`. `trx` is ignored. Resolves what the database driver returns for the write.
   *
   * @internal
   */
  updateEntitiesStage(
    contentTypeUID: UID.ContentType,
    params: { fromStageId?: number | null; toStageId: number; trx?: unknown }
  ): Promise<number | number[]>;
  /**
   * Removes the stage of every entry of a content type. Resolves the number of removed links.
   *
   * @internal
   */
  deleteAllEntitiesStage(contentTypeUID: UID.ContentType): Promise<number>;
};

/**
 * A reference to the admin user who created or last updated a row, present when the read
 * populates `createdBy` or `updatedBy`.
 */
export type CreatorReference = { id: number };

/** A transition permission of a workflow stage, with the fields that the read selected. */
export type WorkflowStagePermission = Pick<
  StagePermissionRow,
  'id' | 'documentId' | 'action' | 'actionParameters'
> &
  Partial<
    Omit<StagePermissionRow, 'id' | 'documentId' | 'action' | 'actionParameters' | 'role'>
  > & {
    role: Pick<NonNullable<StagePermissionRow['role']>, 'id' | 'documentId' | 'name'> &
      Partial<NonNullable<StagePermissionRow['role']>>;
  };

/** A stage of a workflow, with its transition permissions when the read populates them. */
export type WorkflowStage = StageRow & { permissions?: WorkflowStagePermission[] };

/** A workflow row as the database returns it. Each relation is present when the read populates it. */
export type WorkflowRow = {
  id: number;
  documentId: string;
  name: string;
  /** The content types assigned to the workflow. */
  contentTypes: UID.ContentType[];
  /** Workflows are not localized. */
  locale: null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  /** The stages, in order. */
  stages?: WorkflowStage[];
  /** The stage that entries must be at to be published, `null` when there is none. */
  stageRequiredToPublish?: StageRow | null;
  /** `null` for a workflow created by the plugin. */
  createdBy?: CreatorReference | null;
  /** `null` for a workflow updated by the plugin. */
  updatedBy?: CreatorReference | null;
};

/** The populate of a workflow read. */
export type WorkflowPopulate = queryParams.Params['populate'];

type WorkflowRelation = 'stages' | 'stageRequiredToPublish' | 'createdBy' | 'updatedBy';

/**
 * The relations that a workflow read with `TPopulate` populates. Without `populate`, the read
 * populates the stages, their permissions and the stage required to publish.
 */
type PopulatedRelation<TPopulate> = 0 extends 1 & TPopulate
  ? never
  : [TPopulate] extends [undefined]
    ? 'stages' | 'stageRequiredToPublish'
    : [TPopulate] extends ['*']
      ? WorkflowRelation
      : [TPopulate] extends [string]
        ? Extract<TPopulate, WorkflowRelation>
        : [TPopulate] extends [readonly (infer TName)[]]
          ? Extract<TName, WorkflowRelation>
          : Extract<
              {
                [TKey in keyof TPopulate]: TPopulate[TKey] extends false ? never : TKey;
              }[keyof TPopulate],
              WorkflowRelation
            >;

/** A workflow row with the relations that `TPopulate` populates. */
export type PopulatedWorkflow<TPopulate extends WorkflowPopulate | undefined = undefined> =
  WorkflowRow & Required<Pick<WorkflowRow, PopulatedRelation<TPopulate>>>;

/** A workflow read with its stages, their permissions and the stage required to publish. */
export type StoredWorkflow = WorkflowRow & {
  stages: (StageRow & { permissions: WorkflowStagePermission[] })[];
  stageRequiredToPublish: StageRow | null;
};

/**
 * The query of a workflow read. A `contentTypes` filter that is a string matches the workflows
 * assigned to that content type.
 */
export type WorkflowQuery<TPopulate extends WorkflowPopulate | undefined> = Omit<
  queryParams.Params,
  'populate'
> & { populate?: TPopulate };

/** A workflow to create, as the workflow routes receive it. */
export type WorkflowCreateInput = {
  name: string;
  stages: StageInput[];
  contentTypes?: UID.ContentType[];
  /** The name of one of `stages`. */
  stageRequiredToPublishName?: string | null;
};

/** The changes to a workflow, as the workflow routes receive them. */
export type WorkflowUpdateInput = {
  name?: string;
  /** The stages that replace the stored ones. A stage without `id` is created. */
  stages?: (StageInput & { id?: number })[];
  /** The content types that replace the assigned ones. */
  contentTypes?: UID.ContentType[];
  /** The name of one of the stages, `null` to require none. */
  stageRequiredToPublishName?: string | null;
};

/**
 * The `workflows` service: the review workflows, the content types assigned to them, and their
 * stages.
 */
export type WorkflowsService = {
  /**
   * Resolves the workflows that match the query.
   *
   * @internal
   */
  find<TPopulate extends WorkflowPopulate | undefined = undefined>(
    opts?: WorkflowQuery<TPopulate>
  ): Promise<PopulatedWorkflow<TPopulate>[]>;
  /**
   * Resolves the workflow with this ID, `null` when there is none.
   *
   * @internal
   */
  findById<TPopulate extends WorkflowPopulate | undefined = undefined>(
    id: Data.ID,
    opts?: { populate?: TPopulate }
  ): Promise<PopulatedWorkflow<TPopulate> | null>;
  /**
   * Creates the workflow and its stages, and assigns the `contentTypes` to it: their entries move
   * to its first stage, and the content types leave their previous workflow. Rejects with a
   * `ValidationError` when the stages are missing, over the limit or share a name, or when the
   * workflows are at the limit, and with an `ApplicationError` when `stageRequiredToPublishName`
   * names none of the stages.
   *
   * @internal
   */
  create(opts: { data: WorkflowCreateInput }): Promise<StoredWorkflow>;
  /**
   * Updates the workflow, read with its stages. `stages` replace the stored stages, and
   * `contentTypes` the assigned content types. Rejects with a `ValidationError` when the stages
   * are empty, over the limit or share a name, and with an `ApplicationError` when a stage belongs
   * to another workflow or when `stageRequiredToPublishName` names none of the stages.
   *
   * @internal
   */
  update(
    workflow: PopulatedWorkflow<'stages'>,
    opts: { data: WorkflowUpdateInput }
  ): Promise<StoredWorkflow>;
  /**
   * Deletes the workflow, read with its stages, and its stages, and removes the stage of the
   * entries of its content types. Rejects with an `ApplicationError` for the last workflow.
   * Resolves the deleted row, `null` when it does not exist.
   *
   * @internal
   */
  delete(
    workflow: PopulatedWorkflow<'stages'>,
    opts: { populate?: WorkflowPopulate }
  ): Promise<WorkflowRow | null>;
  /**
   * Counts the workflows.
   *
   * @internal
   */
  count(): Promise<number>;
  /**
   * Resolves the workflow assigned to the content type, `null` when there is none.
   */
  getAssignedWorkflow<TPopulate extends WorkflowPopulate | undefined = undefined>(
    uid: UID.ContentType,
    opts?: Omit<WorkflowQuery<TPopulate>, 'filters'>
  ): Promise<PopulatedWorkflow<TPopulate> | null>;
  /**
   * Resolves the workflows assigned to the content type. A content type normally has one workflow.
   *
   * @internal
   */
  _getAssignedWorkflows<TPopulate extends WorkflowPopulate | undefined = undefined>(
    uid: UID.ContentType,
    opts?: Omit<WorkflowQuery<TPopulate>, 'filters'>
  ): Promise<PopulatedWorkflow<TPopulate>[]>;
  /**
   * Resolves the workflow assigned to the content type, with its stages. Rejects with an
   * `ApplicationError` when there is none.
   *
   * @internal
   */
  assertContentTypeBelongsToWorkflow(uid: UID.ContentType): Promise<PopulatedWorkflow<'stages'>>;
  /**
   * Throws an `ApplicationError` when the stage is not one of the workflow's stages. Does nothing
   * without `stageId`.
   *
   * @internal
   */
  assertStageBelongsToWorkflow(
    stageId: number | undefined,
    workflow: { name: string; stages: { id: number }[] }
  ): void;
};
