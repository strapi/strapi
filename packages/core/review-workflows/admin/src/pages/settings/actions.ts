import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

import { Stage, Workflow } from '../../../../../../../shared/contracts/review-workflows';
import { Permission, SanitizedAdminRole } from '../../../../../../../shared/contracts/shared';

import {
  ACTION_ADD_STAGE,
  ACTION_CLONE_STAGE,
  ACTION_DELETE_STAGE,
  ACTION_RESET_WORKFLOW,
  ACTION_SET_CONTENT_TYPES,
  ACTION_SET_IS_LOADING,
  ACTION_SET_ROLES,
  ACTION_SET_WORKFLOW,
  ACTION_SET_WORKFLOWS,
  ACTION_UPDATE_STAGE,
  ACTION_UPDATE_STAGES,
  ACTION_UPDATE_STAGE_POSITION,
  ACTION_UPDATE_WORKFLOW,
} from './constants';

export function cloneStage(id: number) {
  return {
    type: ACTION_CLONE_STAGE,
    payload: { id },
  };
}

export function setWorkflow({ workflow }: { workflow: Workflow | null }) {
  return {
    type: ACTION_SET_WORKFLOW,
    payload: workflow,
  };
}

export function setWorkflows({ workflows }: { workflows: Workflow[] }) {
  return {
    type: ACTION_SET_WORKFLOWS,
    payload: workflows,
  };
}

export function deleteStage(stageId: number) {
  return {
    type: ACTION_DELETE_STAGE,
    payload: {
      stageId,
    },
  };
}

export function addStage(stage: Partial<Stage>) {
  return {
    type: ACTION_ADD_STAGE,
    payload: stage,
  };
}

export interface PartialStage extends Omit<Stage, 'permissions'> {
  permissions?: Partial<Permission>[];
}

export function updateStage(stageId: number, payload: Partial<PartialStage>) {
  return {
    type: ACTION_UPDATE_STAGE,
    payload: {
      stageId,
      ...payload,
    },
  };
}

export function updateStages(payload: Partial<PartialStage>) {
  return {
    type: ACTION_UPDATE_STAGES,
    payload,
  };
}

export function updateStagePosition(oldIndex: number, newIndex: number) {
  return {
    type: ACTION_UPDATE_STAGE_POSITION,
    payload: {
      newIndex,
      oldIndex,
    },
  };
}

export function updateWorkflow(payload: Partial<Workflow>) {
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

export function setContentTypes(payload: {
  collectionTypes?: Contracts.ContentTypes.ContentType[];
  singleTypes?: Contracts.ContentTypes.ContentType[];
}) {
  return {
    type: ACTION_SET_CONTENT_TYPES,
    payload,
  };
}

export function setRoles(payload?: (SanitizedAdminRole & { usersCount?: number | undefined })[]) {
  return {
    type: ACTION_SET_ROLES,
    payload,
  };
}

export function setIsLoading(isLoading: boolean) {
  return {
    type: ACTION_SET_IS_LOADING,
    payload: isLoading,
  };
}
