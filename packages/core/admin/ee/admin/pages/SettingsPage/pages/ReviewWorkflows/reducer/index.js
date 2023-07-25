import { current, produce } from 'immer';
import isEqual from 'lodash/isEqual';

import {
  ACTION_ADD_STAGE,
  ACTION_DELETE_STAGE,
  ACTION_RESET_WORKFLOW,
  ACTION_SET_WORKFLOW,
  ACTION_UPDATE_STAGE,
  ACTION_UPDATE_STAGE_POSITION,
  ACTION_UPDATE_WORKFLOW,
  STAGE_COLOR_DEFAULT,
} from '../constants';

export const initialState = {
  status: 'loading',
  serverState: {
    workflow: null,
  },
  clientState: {
    currentWorkflow: {
      data: {
        name: '',
        contentTypes: [],
        stages: [],
      },
      isDirty: false,
      hasDeletedServerStages: false,
    },
  },
};

export function reducer(state = initialState, action) {
  return produce(state, (draft) => {
    const { payload } = action;

    switch (action.type) {
      case ACTION_SET_WORKFLOW: {
        const { status, workflow } = payload;

        draft.status = status;

        if (workflow) {
          draft.serverState.workflow = workflow;
          draft.clientState.currentWorkflow.data = {
            ...workflow,
            stages: workflow.stages.map((stage) => ({
              ...stage,
              // A safety net in case a stage does not have a color assigned;
              // this normallly should not happen
              color: stage?.color ?? STAGE_COLOR_DEFAULT,
            })),
          };
        }

        draft.clientState.currentWorkflow.hasDeletedServerStages = false;
        break;
      }

      case ACTION_RESET_WORKFLOW: {
        draft.clientState.currentWorkflow.data = initialState.clientState.currentWorkflow.data;
        draft.serverState = initialState.serverState;
        break;
      }

      case ACTION_DELETE_STAGE: {
        const { stageId } = payload;
        const { currentWorkflow } = state.clientState;

        draft.clientState.currentWorkflow.data.stages = currentWorkflow.data.stages.filter(
          (stage) => (stage?.id ?? stage.__temp_key__) !== stageId
        );

        if (!currentWorkflow.hasDeletedServerStages) {
          draft.clientState.currentWorkflow.hasDeletedServerStages = !!(
            state.serverState.workflow?.stages ?? []
          ).find((stage) => stage.id === stageId);
        }

        break;
      }

      case ACTION_ADD_STAGE: {
        const { currentWorkflow } = state.clientState;

        if (!currentWorkflow.data) {
          draft.clientState.currentWorkflow.data = {
            stages: [],
          };
        }

        const newTempKey = getMaxTempKey(draft.clientState.currentWorkflow.data.stages);

        draft.clientState.currentWorkflow.data.stages.push({
          ...payload,
          color: payload?.color ?? STAGE_COLOR_DEFAULT,
          __temp_key__: newTempKey,
        });

        break;
      }

      case ACTION_UPDATE_STAGE: {
        const { currentWorkflow } = state.clientState;
        const { stageId, ...modified } = payload;

        draft.clientState.currentWorkflow.data.stages = currentWorkflow.data.stages.map((stage) =>
          (stage.id ?? stage.__temp_key__) === stageId
            ? {
                ...stage,
                ...modified,
              }
            : stage
        );

        break;
      }

      case ACTION_UPDATE_STAGE_POSITION: {
        const {
          currentWorkflow: {
            data: { stages },
          },
        } = state.clientState;
        const { newIndex, oldIndex } = payload;

        if (newIndex >= 0 && newIndex < stages.length) {
          const stage = stages[oldIndex];
          let newStages = [...stages];

          newStages.splice(oldIndex, 1);
          newStages.splice(newIndex, 0, stage);

          draft.clientState.currentWorkflow.data.stages = newStages;
        }

        break;
      }

      case ACTION_UPDATE_WORKFLOW: {
        draft.clientState.currentWorkflow.data = {
          ...draft.clientState.currentWorkflow.data,
          ...payload,
        };

        break;
      }

      default:
        break;
    }

    if (state.clientState.currentWorkflow.data && draft.serverState.workflow) {
      draft.clientState.currentWorkflow.isDirty = !isEqual(
        current(draft.clientState.currentWorkflow).data,
        draft.serverState.workflow
      );
    } else {
      // if there is no workflow on the server, the workflow is awalys considered dirty
      draft.clientState.currentWorkflow.isDirty = true;
    }
  });
}

/**
 * @type {(stages: Array<{id?: number; __temp_key__: number}>) => number}
 */
const getMaxTempKey = (stages = []) => {
  /**
   * We check if there are ids or __temp_key__ because you may add a stage to a list of stages
   * already in the DB, alternatively you might add multiple new stages at once.
   */
  const ids = stages.map((stage) => stage.id ?? stage.__temp_key__);

  /**
   * If there are no ids it will return 0 as the max value
   * because the max value is -1.
   */
  return Math.max(...ids, -1) + 1;
};
