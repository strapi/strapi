import { initialState, reducer } from '..';

import {
  ACTION_SET_WORKFLOWS,
  ACTION_DELETE_STAGE,
  ACTION_ADD_STAGE,
  ACTION_UPDATE_STAGE,
  ACTION_UPDATE_STAGE_POSITION,
} from '../../constants';

const WORKFLOWS_FIXTURE = [
  {
    id: 1,
    stages: [
      {
        id: 1,
        color: '#4945FF',
        name: 'stage-1',
      },

      {
        id: 2,
        color: '#4945FF',
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

  test('ACTION_SET_WORKFLOWS with workflows', () => {
    const action = {
      type: ACTION_SET_WORKFLOWS,
      payload: { status: 'loading-state', workflows: WORKFLOWS_FIXTURE },
    };

    const DEFAULT_WORKFLOW_FIXTURE = {
      ...WORKFLOWS_FIXTURE[0],

      // stages without a color should have a default color assigned
      stages: WORKFLOWS_FIXTURE[0].stages.map((stage) => ({
        ...stage,
        color: stage?.color ?? '#4945ff',
      })),
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        status: 'loading-state',
        serverState: expect.objectContaining({
          currentWorkflow: DEFAULT_WORKFLOW_FIXTURE,
          workflows: WORKFLOWS_FIXTURE,
        }),
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: DEFAULT_WORKFLOW_FIXTURE,
            isDirty: false,
            hasDeletedServerStages: false,
          }),
        }),
      })
    );
  });

  test('ACTION_SET_WORKFLOWS without workflows', () => {
    const action = {
      type: ACTION_SET_WORKFLOWS,
      payload: { status: 'loading', workflows: null },
    };

    expect(reducer(state, action)).toStrictEqual({
      ...initialState,
      serverState: expect.objectContaining({
        currentWorkflow: null,
      }),
    });
  });

  test('ACTION_DELETE_STAGE', () => {
    const action = {
      type: ACTION_DELETE_STAGE,
      payload: { stageId: 1 },
    };

    state = {
      status: expect.any(String),
      serverState: {
        currentWorkflow: WORKFLOWS_FIXTURE[0],
      },
      clientState: {
        currentWorkflow: { data: WORKFLOWS_FIXTURE[0], isDirty: false },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              stages: expect.arrayContaining([WORKFLOWS_FIXTURE[0].stages[1]]),
            }),
          }),
        }),
      })
    );
  });

  test('ACTION_DELETE_STAGE - set hasDeletedServerStages to true if stageId exists on the server', () => {
    const action = {
      type: ACTION_DELETE_STAGE,
      payload: { stageId: 1 },
    };

    state = {
      status: expect.any(String),
      serverState: {
        currentWorkflow: WORKFLOWS_FIXTURE[0],
      },
      clientState: {
        currentWorkflow: {
          data: WORKFLOWS_FIXTURE[0],
          isDirty: false,
        },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            hasDeletedServerStages: true,
          }),
        }),
      })
    );
  });

  test('ACTION_DELETE_STAGE - set hasDeletedServerStages to false if stageId does not exist on the server', () => {
    const action = {
      type: ACTION_DELETE_STAGE,
      payload: { stageId: 3 },
    };

    state = {
      status: expect.any(String),
      serverState: {
        currentWorkflow: WORKFLOWS_FIXTURE[0],
      },
      clientState: {
        currentWorkflow: {
          data: {
            ...WORKFLOWS_FIXTURE[0],
            stages: [...WORKFLOWS_FIXTURE[0].stages, { __temp_key__: 3, name: 'something' }],
          },
          isDirty: false,
        },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            hasDeletedServerStages: false,
          }),
        }),
      })
    );
  });

  test('ACTION_DELETE_STAGE - keep hasDeletedServerStages true as soon as one server stage has been deleted', () => {
    const actionDeleteServerStage = {
      type: ACTION_DELETE_STAGE,
      payload: { stageId: 1 },
    };

    const actionDeleteClientStage = {
      type: ACTION_DELETE_STAGE,
      payload: { stageId: 3 },
    };

    state = {
      status: expect.any(String),
      serverState: {
        currentWorkflow: WORKFLOWS_FIXTURE[0],
      },
      clientState: {
        currentWorkflow: {
          data: WORKFLOWS_FIXTURE[0],
          isDirty: false,
        },
      },
    };

    state = reducer(state, actionDeleteServerStage);
    state = reducer(state, actionDeleteClientStage);

    expect(state).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            hasDeletedServerStages: true,
          }),
        }),
      })
    );
  });

  test('ACTION_ADD_STAGE', () => {
    const action = {
      type: ACTION_ADD_STAGE,
      payload: { name: 'something' },
    };

    state = {
      status: expect.any(String),
      serverState: expect.any(Object),
      clientState: {
        currentWorkflow: { data: WORKFLOWS_FIXTURE[0], isDirty: false },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              stages: expect.arrayContaining([
                {
                  __temp_key__: 3,
                  color: '#4945ff',
                  name: 'something',
                },
              ]),
            }),
          }),
        }),
      })
    );
  });

  test('ACTION_ADD_STAGE when there are not stages yet', () => {
    const action = {
      type: ACTION_ADD_STAGE,
      payload: { name: 'something' },
    };

    state = {
      status: expect.any(String),
      serverState: expect.any(Object),
      clientState: {
        currentWorkflow: { data: null, isDirty: false },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              stages: expect.arrayContaining([
                {
                  __temp_key__: 0,
                  color: expect.any(String),
                  name: 'something',
                },
              ]),
            }),
          }),
        }),
      })
    );
  });

  test('ACTION_ADD_STAGE should correctly append the key when the ids are not sequential', () => {
    const WORKFLOWS_FIXTURE = [
      {
        id: 1,
        stages: [
          {
            id: 1,
            name: 'stage-1',
          },

          {
            id: 3,
            name: 'stage-2',
          },
        ],
      },
    ];

    const action = {
      type: ACTION_ADD_STAGE,
      payload: { name: 'something' },
    };

    state = {
      status: expect.any(String),
      serverState: expect.any(Object),
      clientState: {
        currentWorkflow: { data: WORKFLOWS_FIXTURE[0], isDirty: false },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              stages: expect.arrayContaining([
                {
                  __temp_key__: 4,
                  color: expect.any(String),
                  name: 'something',
                },
              ]),
            }),
          }),
        }),
      })
    );
  });

  test('ACTION_UPDATE_STAGE', () => {
    const action = {
      type: ACTION_UPDATE_STAGE,
      payload: { stageId: 1, name: 'stage-1-modified' },
    };

    state = {
      status: expect.any(String),
      serverState: expect.any(Object),
      clientState: {
        currentWorkflow: { data: WORKFLOWS_FIXTURE[0], isDirty: false },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              stages: expect.arrayContaining([
                {
                  id: 1,
                  color: '#4945FF',
                  name: 'stage-1-modified',
                },
              ]),
            }),
          }),
        }),
      })
    );
  });

  test('properly compare serverState and clientState and set isDirty accordingly', () => {
    const actionAddStage = {
      type: ACTION_ADD_STAGE,
      payload: { name: 'something' },
    };

    state = {
      status: expect.any(String),
      serverState: {
        currentWorkflow: WORKFLOWS_FIXTURE[0],
      },
      clientState: {
        currentWorkflow: { data: WORKFLOWS_FIXTURE[0], isDirty: false },
      },
    };

    state = reducer(state, actionAddStage);

    expect(state).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            isDirty: true,
          }),
        }),
      })
    );

    const actionDeleteStage = {
      type: ACTION_DELETE_STAGE,
      payload: { stageId: 3 },
    };

    state = reducer(state, actionDeleteStage);

    expect(state).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            isDirty: false,
          }),
        }),
      })
    );
  });

  test('ACTION_UPDATE_STAGE_POSITION', () => {
    const action = {
      type: ACTION_UPDATE_STAGE_POSITION,
      payload: { oldIndex: 0, newIndex: 1 },
    };

    state = {
      status: expect.any(String),
      serverState: {
        currentWorkflow: WORKFLOWS_FIXTURE[0],
      },
      clientState: {
        currentWorkflow: {
          data: WORKFLOWS_FIXTURE[0],
          isDirty: false,
        },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              stages: [
                expect.objectContaining({ name: 'stage-2' }),
                expect.objectContaining({ name: 'stage-1' }),
              ],
            }),
            isDirty: true,
          }),
        }),
      })
    );
  });

  test('ACTION_UPDATE_STAGE_POSITION - does not update position if new index is smaller than 0', () => {
    const action = {
      type: ACTION_UPDATE_STAGE_POSITION,
      payload: { oldIndex: 0, newIndex: -1 },
    };

    state = {
      status: expect.any(String),
      serverState: {
        currentWorkflow: WORKFLOWS_FIXTURE[0],
      },
      clientState: {
        currentWorkflow: {
          data: WORKFLOWS_FIXTURE[0],
          isDirty: false,
        },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              stages: [
                expect.objectContaining({ name: 'stage-1' }),
                expect.objectContaining({ name: 'stage-2' }),
              ],
            }),
            isDirty: false,
          }),
        }),
      })
    );
  });

  test('ACTION_UPDATE_STAGE_POSITION - does not update position if new index is greater than the amount of stages', () => {
    const action = {
      type: ACTION_UPDATE_STAGE_POSITION,
      payload: { oldIndex: 0, newIndex: 3 },
    };

    state = {
      status: expect.any(String),
      serverState: {
        currentWorkflow: WORKFLOWS_FIXTURE[0],
      },
      clientState: {
        currentWorkflow: {
          data: WORKFLOWS_FIXTURE[0],
          isDirty: false,
        },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              stages: [
                expect.objectContaining({ name: 'stage-1' }),
                expect.objectContaining({ name: 'stage-2' }),
              ],
            }),
            isDirty: false,
          }),
        }),
      })
    );
  });
});
