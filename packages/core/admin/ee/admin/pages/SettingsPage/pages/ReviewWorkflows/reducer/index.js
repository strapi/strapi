import { current, produce } from 'immer';
import isEqual from 'lodash/isEqual';

import {
  ACTION_SET_WORKFLOWS,
  ACTION_DELETE_STAGE,
  ACTION_ADD_STAGE,
  ACTION_UPDATE_STAGE,
} from '../constants';

export const initialState = {
  status: 'loading',
  serverState: {
    currentWorkflow: null,
    workflows: [],
  },
  clientState: {
    currentWorkflow: { data: null, isDirty: false },
  },
};

export function reducer(state = initialState, action) {
  return produce(state, (draft) => {
    const { payload } = action;

    switch (action.type) {
      case ACTION_SET_WORKFLOWS: {
        const { status, workflows } = payload;

        draft.status = status;

        if (workflows) {
          const defaultWorkflow = workflows[0];

          draft.serverState.workflows = workflows;
          draft.serverState.currentWorkflow = defaultWorkflow;
          draft.clientState.currentWorkflow.data = defaultWorkflow;
        }
        break;
      }

      case ACTION_DELETE_STAGE: {
        const { stageId } = payload;
        const { currentWorkflow } = state.clientState;

        draft.clientState.currentWorkflow.data = {
          ...currentWorkflow.data,
          stages: currentWorkflow.data.stages.filter(
            (stage) => (stage?.id ?? stage.__temp_key__) !== stageId
          ),
        };

        break;
      }

      case ACTION_ADD_STAGE: {
        const { currentWorkflow } = state.clientState;

        draft.clientState.currentWorkflow.data.stages = [
          ...currentWorkflow.data.stages,
          {
            ...payload,
            __temp_key__: state.clientState.currentWorkflow.data.stages.length + 1,
          },
        ];

        break;
      }

      case ACTION_UPDATE_STAGE: {
        const { currentWorkflow } = state.clientState;

        draft.clientState.currentWorkflow.data.stages = currentWorkflow.data.stages.map((stage) => {
          if ((stage.id ?? stage.__temp_key__) === payload.stageId) {
            const { stageId, ...modified } = payload;

            return {
              ...stage,
              ...modified,
            };
          }

          return stage;
        });

        break;
      }

      default:
        break;
    }

    if (state.clientState.currentWorkflow.data) {
      draft.clientState.currentWorkflow.isDirty = !isEqual(
        current(draft.clientState.currentWorkflow).data,
        state.serverState.currentWorkflow
      );
    }
  });
}
