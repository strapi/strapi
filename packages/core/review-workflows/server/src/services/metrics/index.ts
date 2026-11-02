import '@strapi/types';
import type { Data } from '@strapi/types';

export const sendDidCreateStage = async () => {
  strapi.telemetry.send('didCreateStage', {});
};

export const sendDidEditStage = async () => {
  strapi.telemetry.send('didEditStage', {});
};

export const sendDidDeleteStage = async () => {
  strapi.telemetry.send('didDeleteStage', {});
};

export const sendDidChangeEntryStage = async () => {
  strapi.telemetry.send('didChangeEntryStage', {});
};

export const sendDidCreateWorkflow = async (
  workflowId: Data.ID,
  hasRequiredStageToPublish: boolean
) => {
  strapi.telemetry.send('didCreateWorkflow', { workflowId, hasRequiredStageToPublish });
};

export const sendDidEditWorkflow = async (
  workflowId: Data.ID,
  hasRequiredStageToPublish: boolean
) => {
  strapi.telemetry.send('didEditWorkflow', { workflowId, hasRequiredStageToPublish });
};

export const sendDidEditAssignee = async (fromId: Data.ID | null, toId: Data.ID | null) => {
  strapi.telemetry.send('didEditAssignee', { from: fromId, to: toId });
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
  await strapi.telemetry.send('didSendReviewWorkflowPropertiesOnceAWeek', {
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
