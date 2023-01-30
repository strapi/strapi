import produce from 'immer';

import { ACTION_SET_WORKFLOW } from '../constants';

export const initialState = {
  workflows: {
    state: 'loading',
    stages: [],
  },
};

export function reducer(state = initialState, action) {
  return produce(state, (draft) => {
    switch (action.type) {
      case ACTION_SET_WORKFLOW:
        draft.workflows.status = action.payload.status;
        draft.workflows.stages = action.payload.stages ?? [];
        break;

      default:
        break;
    }
  });
}
