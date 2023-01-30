import { initialState, reducer } from '..';

import { ACTION_SET_WORKFLOW } from '../../constants';

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

  test('should handle ACTION_SET_WORKFLOW', () => {
    const action = {
      type: ACTION_SET_WORKFLOW,
      payload: { status: 'loading-state', stages: STAGES_FIXTURE },
    };

    expect(reducer(state, action)).toEqual({
      ...initialState,
      workflows: {
        ...initialState.workflows,
        status: 'loading-state',
        stages: STAGES_FIXTURE,
      },
    });
  });
});
