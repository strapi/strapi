import { initialState, reducer } from '..';

import { ACTION_SET_WORKFLOWS } from '../../constants';

const WORKFLOWS_FIXTURE = [
  {
    id: 1,
    stages: [
      {
        id: 1,
        name: 'stage-1',
      },

      {
        id: 2,
        name: 'stage-2',
      },
    ],
  },
];

describe('Admin | Settings | Review Workflows | reducer', () => {
  let state;

  beforeEach(() => {
    state = initialState;
  });

  test('should return the initialState', () => {
    expect(reducer(state, {})).toStrictEqual(initialState);
  });

  test('should handle ACTION_SET_WORKFLOWS', () => {
    const action = {
      type: ACTION_SET_WORKFLOWS,
      payload: { status: 'loading-state', workflows: WORKFLOWS_FIXTURE },
    };

    expect(reducer(state, action)).toEqual({
      ...initialState,
      status: 'loading-state',
      serverState: {
        ...initialState.serverState,
        workflows: [...initialState.serverState.workflows, ...WORKFLOWS_FIXTURE],
      },
      clientState: {
        workflows: [],
      },
    });
  });
});
