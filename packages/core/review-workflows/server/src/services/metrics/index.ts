import { getStrapi } from '../../utils/strapi-ref';

// Stays a plain object: user extensions patch `plugin.services['workflow-metrics'].<fn>` in place
// (see __tests__/plugin-shape.vitest.test.ts), so `strapi` is read at call time.

export const sendDidCreateStage = async () => {
  getStrapi().telemetry.send('didCreateStage', {});
};

export const sendDidEditStage = async () => {
  getStrapi().telemetry.send('didEditStage', {});
};

export const sendDidDeleteStage = async () => {
  getStrapi().telemetry.send('didDeleteStage', {});
};

export const sendDidChangeEntryStage = async () => {
  getStrapi().telemetry.send('didChangeEntryStage', {});
};

export const sendDidCreateWorkflow = async (
  workflowId: string,
  hasRequiredStageToPublish: boolean
) => {
  getStrapi().telemetry.send('didCreateWorkflow', { workflowId, hasRequiredStageToPublish });
};

export const sendDidEditWorkflow = async (
  workflowId: string,
  hasRequiredStageToPublish: boolean
) => {
  getStrapi().telemetry.send('didEditWorkflow', { workflowId, hasRequiredStageToPublish });
};

export const sendDidEditAssignee = async (fromId: any, toId: any) => {
  getStrapi().telemetry.send('didEditAssignee', { from: fromId, to: toId });
};

export type WeeklyMetrics = {
  numberOfActiveWorkflows: number;
  avgStagesCount: number;
  maxStagesCount: number | undefined;
  activatedContentTypes: number;
};

export const sendDidSendReviewWorkflowPropertiesOnceAWeek = async ({
  numberOfActiveWorkflows,
  avgStagesCount,
  maxStagesCount,
  activatedContentTypes,
}: WeeklyMetrics) => {
  await getStrapi().telemetry.send('didSendReviewWorkflowPropertiesOnceAWeek', {
    groupProperties: {
      numberOfActiveWorkflows,
      avgStagesCount,
      maxStagesCount,
      activatedContentTypes,
    },
  });
};

export default {
  sendDidCreateStage,
  sendDidEditStage,
  sendDidDeleteStage,
  sendDidChangeEntryStage,
  sendDidCreateWorkflow,
  sendDidEditWorkflow,
  sendDidSendReviewWorkflowPropertiesOnceAWeek,
  sendDidEditAssignee,
};
