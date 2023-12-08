import {
  ACTION_ADD_STAGE,
  ACTION_CLONE_STAGE,
  ACTION_DELETE_STAGE,
  ACTION_RESET_WORKFLOW,
  ACTION_SET_CONTENT_TYPES,
  ACTION_SET_IS_LOADING,
  ACTION_SET_ROLES,
  ACTION_SET_WORKFLOW,
  ACTION_UPDATE_STAGE,
  ACTION_UPDATE_STAGES,
  ACTION_UPDATE_STAGE_POSITION,
  ACTION_UPDATE_WORKFLOW,
} from '../constants';
import { State, initialState, reducer } from '../reducer';

const WORKFLOW_FIXTURE = {
  id: 1,
  name: 'Workflow fixture',
  stages: [
    {
      id: 1,
      color: '#4945FF',
      name: 'stage-1',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 2,
      color: '#4945FF',
      name: 'stage-2',
      createdAt: '',
      updatedAt: '',
    },
  ],
};

describe('Admin | Settings | Review Workflows | reducer', () => {
  let state: State & { status?: string };

  beforeEach(() => {
    state = initialState;
  });

  test('ACTION_SET_IS_LOADING', () => {
    const action = {
      type: ACTION_SET_IS_LOADING,
      payload: true,
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          isLoading: true,
        }),
      })
    );
  });

  test('ACTION_SET_CONTENT_TYPES', () => {
    const action = {
      type: ACTION_SET_CONTENT_TYPES,
      payload: { collectionTypes: [{ id: 1 }] },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        serverState: expect.objectContaining({
          contentTypes: {
            collectionTypes: [{ id: 1 }],
          },
        }),
      })
    );
  });

  test('ACTION_SET_ROLES', () => {
    const action = {
      type: ACTION_SET_ROLES,
      payload: [{ id: 1 }],
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        serverState: expect.objectContaining({
          roles: [{ id: 1 }],
        }),
      })
    );
  });

  test('ACTION_SET_WORKFLOW with workflows', () => {
    const action = {
      type: ACTION_SET_WORKFLOW,
      payload: WORKFLOW_FIXTURE,
    };

    const DEFAULT_WORKFLOW_FIXTURE = {
      ...WORKFLOW_FIXTURE,

      // stages without a color should have a default color assigned
      stages: WORKFLOW_FIXTURE.stages?.map((stage) => ({
        ...stage,
        color: stage?.color ?? '#4945ff',
      })),
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        serverState: expect.objectContaining({
          workflow: WORKFLOW_FIXTURE,
        }),
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: DEFAULT_WORKFLOW_FIXTURE,
          }),
        }),
      })
    );
  });

  test('ACTION_DELETE_STAGE', () => {
    const action = {
      type: ACTION_DELETE_STAGE,
      payload: { stageId: 1 },
    };

    state = {
      status: expect.any(String),
      serverState: {
        workflow: WORKFLOW_FIXTURE,
      },
      clientState: {
        currentWorkflow: { data: WORKFLOW_FIXTURE },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        serverState: expect.objectContaining({
          workflow: WORKFLOW_FIXTURE,
        }),
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              stages: expect.arrayContaining([WORKFLOW_FIXTURE.stages?.[1]]),
            }),
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
        currentWorkflow: { data: WORKFLOW_FIXTURE },
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

  test('ACTION_CLONE_STAGE - existing stages', () => {
    const action = {
      type: ACTION_CLONE_STAGE,
      payload: { id: 1 },
    };

    state = {
      status: expect.any(String),
      serverState: expect.any(Object),
      clientState: {
        currentWorkflow: { data: WORKFLOW_FIXTURE },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              stages: [
                expect.objectContaining({
                  id: 1,
                }),

                expect.objectContaining({
                  id: undefined,
                  __temp_key__: 3,
                  name: 'stage-1',
                }),

                expect.objectContaining({
                  id: 2,
                }),
              ],
            }),
          }),
        }),
      })
    );
  });

  test('ACTION_CLONE_STAGE - stages that haven not been saved yet', () => {
    const action = {
      type: ACTION_CLONE_STAGE,
      payload: { id: 4 },
    };

    state = {
      status: expect.any(String),
      serverState: expect.any(Object),
      clientState: {
        currentWorkflow: {
          data: {
            ...WORKFLOW_FIXTURE,
            stages: [
              ...(WORKFLOW_FIXTURE.stages || []),
              {
                id: 4,
                __temp_key__: 4,
                color: '#4945FF',
                name: 'stage-temp',
                createdAt: '',
                updatedAt: '',
              },
            ],
          },
        },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              stages: [
                expect.any(Object),
                expect.any(Object),
                expect.objectContaining({
                  name: 'stage-temp',
                }),
                expect.objectContaining({
                  name: 'stage-temp',
                }),
              ],
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
        currentWorkflow: {
          data: {
            stages: [],
          },
        },
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
    const WORKFLOW_FIXTURE = {
      id: 1,
      stages: [
        {
          id: 1,
          name: 'stage-1',
          color: '#4945FF',
          createdAt: '',
          updatedAt: '',
        },

        {
          id: 3,
          name: 'stage-2',
          color: '#4945FF',
          createdAt: '',
          updatedAt: '',
        },
      ],
    };

    const action = {
      type: ACTION_ADD_STAGE,
      payload: { name: 'something' },
    };

    state = {
      status: expect.any(String),
      serverState: expect.any(Object),
      clientState: {
        currentWorkflow: { data: WORKFLOW_FIXTURE },
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
        currentWorkflow: { data: WORKFLOW_FIXTURE },
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
                  createdAt: '',
                  updatedAt: '',
                },
              ]),
            }),
          }),
        }),
      })
    );
  });

  test('ACTION_UPDATE_STAGES', () => {
    const action = {
      type: ACTION_UPDATE_STAGES,
      payload: { permissions: [1, 2, 3] },
    };

    state = {
      status: expect.any(String),
      serverState: expect.any(Object),
      clientState: {
        currentWorkflow: { data: WORKFLOW_FIXTURE },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              stages: expect.arrayContaining([
                expect.objectContaining({
                  permissions: [1, 2, 3],
                }),
                expect.objectContaining({
                  permissions: [1, 2, 3],
                }),
              ]),
            }),
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
        workflow: WORKFLOW_FIXTURE,
      },
      clientState: {
        currentWorkflow: {
          data: WORKFLOW_FIXTURE,
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
        workflow: WORKFLOW_FIXTURE,
      },
      clientState: {
        currentWorkflow: {
          data: WORKFLOW_FIXTURE,
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
        workflow: WORKFLOW_FIXTURE,
      },
      clientState: {
        currentWorkflow: {
          data: WORKFLOW_FIXTURE,
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
          }),
        }),
      })
    );
  });

  test('ACTION_UPDATE_WORKFLOW', () => {
    const action = {
      type: ACTION_UPDATE_WORKFLOW,
      payload: { name: 'test' },
    };

    state = {
      status: expect.any(String),
      serverState: {
        workflow: WORKFLOW_FIXTURE,
      },
      clientState: {
        currentWorkflow: {
          data: WORKFLOW_FIXTURE,
        },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              name: 'test',
            }),
          }),
        }),
      })
    );
  });

  test('ACTION_RESET_WORKFLOW', () => {
    const action = {
      type: ACTION_RESET_WORKFLOW,
    };

    state = {
      status: expect.any(String),
      serverState: {
        workflow: WORKFLOW_FIXTURE,
      },
      clientState: {
        currentWorkflow: {
          data: WORKFLOW_FIXTURE,
        },
      },
    };

    expect(reducer(state, action)).toStrictEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          currentWorkflow: expect.objectContaining({
            data: expect.objectContaining({
              name: '',
              stages: [],
            }),
          }),
        }),
      })
    );
  });
});
