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

export const sendDidCreateWorkflow = async () => {
  strapi.telemetry.send('didCreateWorkflow', {});
};

export const sendDidEditWorkflow = async () => {
  strapi.telemetry.send('didEditWorkflow', {});
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
