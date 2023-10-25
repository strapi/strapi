'use strict';

const sendDidCreateStage = async () => {
  strapi.telemetry.send('didCreateStage', {});
};

const sendDidEditStage = async () => {
  strapi.telemetry.send('didEditStage', {});
};

const sendDidDeleteStage = async () => {
  strapi.telemetry.send('didDeleteStage', {});
};

const sendDidChangeEntryStage = async () => {
  strapi.telemetry.send('didChangeEntryStage', {});
};

const sendDidCreateWorkflow = async () => {
  strapi.telemetry.send('didCreateWorkflow', {});
};

const sendDidEditWorkflow = async () => {
  strapi.telemetry.send('didEditWorkflow', {});
};

const sendDidEditAssignee = async (fromId, toId) => {
  strapi.telemetry.send('didEditAssignee', { from: fromId, to: toId });
};

const sendDidSendReviewWorkflowPropertiesOnceAWeek = async (
  numberOfActiveWorkflows,
  avgStagesCount,
  maxStagesCount,
  activatedContentTypes
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

module.exports = {
  sendDidCreateStage,
  sendDidEditStage,
  sendDidDeleteStage,
  sendDidChangeEntryStage,
  sendDidCreateWorkflow,
  sendDidEditWorkflow,
  sendDidSendReviewWorkflowPropertiesOnceAWeek,
  sendDidEditAssignee,
};
