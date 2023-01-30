import { initialState, reducer } from '..';

import { ACTION_SET_LOADING_STATE, ACTION_SET_STAGES } from '../../constants';

const STAGES_FIXTURE = [
  {
    id: 1,
    name: 'stage-1',
  },

  {
    id: 2,
    name: 'stage-2',
  },
];

describe('Admin | Settings | Review Workflows | reducer', () => {
  let state;

  beforeEach(() => {
    state = initialState;
  });

  test('should return the initialState', () => {
    expect(reducer(state, {})).toEqual(initialState);
  });

  test('should handle ACTION_SET_LOADING_STATE', () => {
    const action = { type: ACTION_SET_LOADING_STATE, payload: { state: 'loading-state' } };

    expect(reducer(state, action)).toEqual({
      ...initialState,
      workflows: {
        ...initialState.workflows,
        state: 'loading-state',
      },
    });
  });

  test('should handle ACTION_SET_STAGES', () => {
    const action = { type: ACTION_SET_STAGES, payload: { stages: STAGES_FIXTURE } };

    expect(reducer(state, action)).toEqual({
      ...initialState,
      workflows: {
        ...initialState.workflows,
        stages: STAGES_FIXTURE,
      },
    });
  });
});
