import type { Core } from '@strapi/types';

import type { StageId } from '../domain/workflow';

export const STAGE_ATTRIBUTE = 'strapi_stage';

const WORKFLOW_UID = 'plugin::review-workflows.workflow';
// Workflow changes clear the cache on this instance; other instances see them within this delay
const CACHE_TTL_MS = 30_000;

export type WorkflowSummary = {
  id: string;
  name: string;
  contentTypes: string[];
  stageRequiredToPublishId: StageId | null;
  stages: Array<{ id: StageId; name: string; color: string | null }>;
};

/**
 * Thin adapter over Review Workflows (Enterprise Edition). Every method is a no-op when the
 * feature is not licensed, so the rest of the plugin does not need to know.
 */
export const createReviewWorkflowsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const workflowByContentType = new Map<string, { id: string | null; expiresAt: number }>();

  const isEnabled = () => {
    return (
      strapi.ee?.features?.isEnabled('review-workflows') === true &&
      strapi.contentTypes[WORKFLOW_UID as keyof typeof strapi.contentTypes] !== undefined
    );
  };

  return {
    isEnabled,

    /**
     * Whether entries of this content type carry a review stage.
     */
    hasStages(contentType: { attributes: Record<string, unknown> }) {
      return isEnabled() && STAGE_ATTRIBUTE in contentType.attributes;
    },

    async getWorkflowId(uid: string): Promise<string | null> {
      const cached = workflowByContentType.get(uid);

      if (cached !== undefined && cached.expiresAt > Date.now()) {
        return cached.id;
      }

      const workflow = await strapi
        .plugin('review-workflows')
        .service('workflows')
        .getAssignedWorkflow(uid, { fields: ['id'] });

      const id = workflow ? String(workflow.id) : null;
      workflowByContentType.set(uid, { id, expiresAt: Date.now() + CACHE_TTL_MS });

      return id;
    },

    async listWorkflows(): Promise<WorkflowSummary[]> {
      if (!isEnabled()) {
        return [];
      }

      const workflows = await strapi.db.query(WORKFLOW_UID).findMany({
        populate: { stages: true, stageRequiredToPublish: true },
        orderBy: { name: 'asc' },
      });

      return workflows.map((workflow: Record<string, any>) => ({
        id: String(workflow.id),
        name: workflow.name,
        contentTypes: workflow.contentTypes ?? [],
        stageRequiredToPublishId: workflow.stageRequiredToPublish?.id ?? null,
        stages: (workflow.stages ?? []).map((stage: Record<string, any>) => ({
          id: stage.id,
          name: stage.name,
          color: stage.color ?? null,
        })),
      }));
    },

    /**
     * Clears the content type to workflow cache whenever a workflow is created, changed or
     * deleted, since that is where content types get (re)assigned.
     */
    subscribeToWorkflowChanges() {
      if (!isEnabled()) {
        return;
      }

      const clear = () => workflowByContentType.clear();

      strapi.db.lifecycles.subscribe({
        models: [WORKFLOW_UID],
        afterCreate: clear,
        afterUpdate: clear,
        afterUpdateMany: clear,
        afterDelete: clear,
        afterDeleteMany: clear,
      });
    },
  };
};

export type ReviewWorkflowsService = ReturnType<typeof createReviewWorkflowsService>;
