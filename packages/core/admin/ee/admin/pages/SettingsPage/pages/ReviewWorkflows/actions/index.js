import {
  ACTION_SET_WORKFLOWS,
  ACTION_DELETE_STAGE,
  ACTION_ADD_STAGE,
  ACTION_UPDATE_STAGE,
  ACTION_UPDATE_STAGE_POSITION,
} from '../constants';

export function setWorkflows({ status, data }) {
  return {
    type: ACTION_SET_WORKFLOWS,
    payload: {
      status,
      workflows: data,
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
