import {
  ACTION_ADD_STAGE,
  ACTION_DELETE_STAGE,
  ACTION_RESET_WORKFLOW,
  ACTION_SET_WORKFLOW,
  ACTION_UPDATE_STAGE,
  ACTION_UPDATE_STAGE_POSITION,
  ACTION_UPDATE_WORKFLOW,
} from '../constants';

export function setWorkflow({ status, data }) {
  return {
    type: ACTION_SET_WORKFLOW,
    payload: {
      status,
      workflow: data,
    },
  };
}

export function deleteStage(stageId) {
  return {
    type: ACTION_DELETE_STAGE,
    payload: {
      stageId,
    },
  };
}

export function addStage(stage = {}) {
  return {
    type: ACTION_ADD_STAGE,
    payload: stage,
  };
}

export function updateStage(stageId, payload) {
  return {
    type: ACTION_UPDATE_STAGE,
    payload: {
      stageId,
      ...payload,
    },
  };
}

export function updateStagePosition(oldIndex, newIndex) {
  return {
    type: ACTION_UPDATE_STAGE_POSITION,
    payload: {
      newIndex,
      oldIndex,
    },
  };
}

export function updateWorkflow(payload) {
  return {
    type: ACTION_UPDATE_WORKFLOW,
    payload,
  };
}

export function resetWorkflow() {
  return {
    type: ACTION_RESET_WORKFLOW,
  };
}
