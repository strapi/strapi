import { isEqual } from 'lodash/fp';
import type { Core, Data, Modules, UID } from '@strapi/types';

import { WORKFLOW_MODEL_UID } from './constants/workflows';
import { WORKFLOW_UPDATE_STAGE } from './constants/webhook-events';

export const AUDITED_EVENTS = {
  WORKFLOW_CREATE: 'workflow.create',
  WORKFLOW_UPDATE: 'workflow.update',
  WORKFLOW_DELETE: 'workflow.delete',
  ENTRY_ASSIGNEE_UPDATE: 'entry.assignee.update',
} as const;

interface WorkflowResource extends Modules.AuditLogs.Resource {
  type: 'workflow';
  id: Data.ID;
  name: string;
}

interface EntryResource extends Modules.AuditLogs.Resource {
  type: 'entry';
  uid: UID.ContentType;
  id: string;
}

/** A stage as stored in the log: roles by name, sorted, so order alone is not a change. */
export interface StageSnapshot {
  name: string;
  color: string | null;
  fromPermissions: string[];
  toPermissions: string[];
}

export interface WorkflowSnapshot {
  name: string;
  contentTypes: string[];
  stages: StageSnapshot[];
  stageRequiredToPublish: string | null;
}

export const WORKFLOW_TRACKED_FIELDS = [
  'name',
  'contentTypes',
  'stages',
  'stageRequiredToPublish',
] as const;

export type WorkflowChanges = {
  [K in keyof WorkflowSnapshot]?: Modules.AuditLogs.FieldChange<WorkflowSnapshot[K]>;
};

/** A workflow row read with WORKFLOW_POPULATE. Without the populated roles, the permission lists come out empty. */
export interface WorkflowRow {
  id: Data.ID;
  name: string;
  contentTypes?: string[] | null;
  stages?: Array<{
    name: string;
    color?: string | null;
    permissions?: Array<{
      actionParameters?: { from?: unknown; to?: unknown } | null;
      role?: { name: string } | null;
    }> | null;
  }> | null;
  stageRequiredToPublish?: { name: string } | null;
}

export interface WorkflowEvent {
  workflowId: Data.ID;
  name: string;
}

export type WorkflowCreateDetails = Omit<WorkflowSnapshot, 'name'>;
export type WorkflowCreateEvent = WorkflowEvent & WorkflowCreateDetails;

export interface WorkflowUpdateDetails {
  changes: WorkflowChanges;
}
export type WorkflowUpdateEvent = WorkflowEvent & WorkflowUpdateDetails;

export interface EntryEvent {
  uid: UID.ContentType;
  documentId: string;
  locale: string | null;
}

export interface AssigneeUpdateDetails {
  locale: string | null;
  changes: { assignee: Modules.AuditLogs.FieldChange<Data.ID | null> };
}
export type AssigneeUpdateEvent = EntryEvent & Pick<AssigneeUpdateDetails, 'changes'>;

interface StageRef {
  id: Data.ID;
  name: string;
}

export interface StageUpdateDetails {
  locale: string | null;
  workflow: { id: Data.ID; name: string | null };
  changes: { stage: Modules.AuditLogs.FieldChange<StageRef> };
}

/** The payload of the existing review-workflows.updateEntryStage webhook event. */
export interface StageUpdateEvent {
  uid: UID.ContentType;
  entity: { documentId: string; locale?: string | null };
  workflow: { id: Data.ID; stages: { from: StageRef; to: StageRef } };
}

const roleNames = (
  permissions: NonNullable<NonNullable<WorkflowRow['stages']>[number]['permissions']>,
  direction: 'from' | 'to'
) =>
  permissions
    .filter((permission) => permission.actionParameters?.[direction] != null)
    .map((permission) => permission.role?.name)
    .filter((name): name is string => typeof name === 'string')
    .sort();

export const toWorkflowSnapshot = (row: WorkflowRow): WorkflowSnapshot => ({
  name: row.name,
  contentTypes: [...(row.contentTypes ?? [])].sort(),
  stages: (row.stages ?? []).map((stage) => ({
    name: stage.name,
    color: stage.color ?? null,
    fromPermissions: roleNames(stage.permissions ?? [], 'from'),
    toPermissions: roleNames(stage.permissions ?? [], 'to'),
  })),
  stageRequiredToPublish: row.stageRequiredToPublish?.name ?? null,
});

export const getWorkflowChanges = (
  previous: WorkflowSnapshot,
  next: WorkflowSnapshot
): WorkflowChanges => {
  const changes: WorkflowChanges = {};

  for (const field of WORKFLOW_TRACKED_FIELDS) {
    if (!isEqual(previous[field], next[field])) {
      Object.assign(changes, { [field]: { before: previous[field], after: next[field] } });
    }
  }

  return changes;
};

export const toWorkflowEvent = (row: WorkflowRow): WorkflowEvent => ({
  workflowId: row.id,
  name: row.name,
});

/**
 * The part of the audit-logs lifecycle service used by this plugin.
 * The full service type lives in the Admin EE package and cannot be imported here.
 */
interface AuditLogsLifecycle {
  registerEvent<TDetails, TResource extends Modules.AuditLogs.Resource>(
    name: string,
    transform: Modules.AuditLogs.EventTransformer<TDetails, TResource>
  ): void;
}

export const registerAuditEvents = (
  { strapi }: { strapi: Core.Strapi },
  auditLogsLifecycle: AuditLogsLifecycle
) => {
  const workflowResource = (event: WorkflowEvent): WorkflowResource => ({
    type: 'workflow',
    id: event.workflowId,
    name: event.name,
  });

  const entryResource = (event: EntryEvent | StageUpdateEvent): EntryResource => ({
    type: 'entry',
    uid: event.uid,
    id: 'entity' in event ? event.entity.documentId : event.documentId,
  });

  auditLogsLifecycle.registerEvent<WorkflowCreateDetails, WorkflowResource>(
    AUDITED_EVENTS.WORKFLOW_CREATE,
    (event: WorkflowCreateEvent) => ({
      resource: workflowResource(event),
      details: {
        contentTypes: event.contentTypes,
        stages: event.stages,
        stageRequiredToPublish: event.stageRequiredToPublish,
      },
    })
  );

  auditLogsLifecycle.registerEvent<WorkflowUpdateDetails, WorkflowResource>(
    AUDITED_EVENTS.WORKFLOW_UPDATE,
    (event: WorkflowUpdateEvent) => ({
      resource: workflowResource(event),
      details: { changes: event.changes },
    })
  );

  auditLogsLifecycle.registerEvent<undefined, WorkflowResource>(
    AUDITED_EVENTS.WORKFLOW_DELETE,
    (event: WorkflowEvent) => ({ resource: workflowResource(event) })
  );

  auditLogsLifecycle.registerEvent<AssigneeUpdateDetails, EntryResource>(
    AUDITED_EVENTS.ENTRY_ASSIGNEE_UPDATE,
    (event: AssigneeUpdateEvent) => ({
      resource: entryResource(event),
      details: { locale: event.locale, changes: event.changes },
    })
  );

  // The webhook payload carries the workflow id only; its name is read here.
  auditLogsLifecycle.registerEvent<StageUpdateDetails, EntryResource>(
    WORKFLOW_UPDATE_STAGE,
    async (event: StageUpdateEvent) => {
      const workflow = await strapi.db
        .query(WORKFLOW_MODEL_UID)
        .findOne({ where: { id: event.workflow.id }, select: ['name'] });

      return {
        resource: entryResource(event),
        details: {
          locale: event.entity.locale ?? null,
          workflow: { id: event.workflow.id, name: workflow?.name ?? null },
          changes: {
            stage: { before: event.workflow.stages.from, after: event.workflow.stages.to },
          },
        },
      };
    }
  );
};
