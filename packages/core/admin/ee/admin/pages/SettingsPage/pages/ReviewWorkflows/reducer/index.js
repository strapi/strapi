import produce from 'immer';

import { ACTION_SET_WORKFLOWS } from '../constants';

export const initialState = {
  status: 'loading',
  serverState: {
    workflows: [],
  },
  clientState: {
    workflows: [],
  },
};

export function reducer(state = initialState, action) {
  return produce(state, (draft) => {
    switch (action.type) {
      case ACTION_SET_WORKFLOWS:
        draft.status = action.payload.status;

        if (action.payload.workflows) {
          draft.serverState.workflows = [
            ...state.serverState.workflows,
            ...action.payload.workflows,
          ];
        }
        break;

      default:
        break;
    }
  });
}
