import produce from 'immer';

import { ACTION_SET_STAGES, ACTION_SET_LOADING_STATE } from '../constants';

const initialState = {
  workflows: {
    state: 'loading',
    stages: [],
  },
};

export function reducer(state = initialState, action) {
  return produce(state, (draft) => {
    switch (action.type) {
      case ACTION_SET_LOADING_STATE:
        draft.workflows.state = action.payload.state;
        break;

      case ACTION_SET_STAGES:
        draft.workflows.stages = action.payload.stages;
        break;

      default:
        break;
    }
  });
}
