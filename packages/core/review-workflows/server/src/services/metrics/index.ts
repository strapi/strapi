import '@strapi/types';

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
  workflowId: string,
  hasRequiredStageToPublish: boolean
) => {
  strapi.telemetry.send('didCreateWorkflow', { workflowId, hasRequiredStageToPublish });
};

export const sendDidEditWorkflow = async (
  workflowId: string,
  hasRequiredStageToPublish: boolean
) => {
  strapi.telemetry.send('didEditWorkflow', { workflowId, hasRequiredStageToPublish });
};

export const sendDidEditAssignee = async (fromId: any, toId: any) => {
  strapi.telemetry.send('didEditAssignee', { from: fromId, to: toId });
};

export const sendDidSendReviewWorkflowPropertiesOnceAWeek = async (
  numberOfActiveWorkflows: number,
  avgStagesCount: number,
  maxStagesCount: number,
  activatedContentTypes: number
) => {
  strapi.telemetry.send('didSendReviewWorkflowPropertiesOnceAWeek', {
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
