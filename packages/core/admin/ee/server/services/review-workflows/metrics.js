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

const sendDidEditAssignee = async (fromId, toId) => {
  strapi.telemetry.send('didEditAssignee', { from: fromId, to: toId });
};

module.exports = {
  sendDidCreateStage,
  sendDidEditStage,
  sendDidDeleteStage,
  sendDidChangeEntryStage,
  sendDidEditAssignee,
};
