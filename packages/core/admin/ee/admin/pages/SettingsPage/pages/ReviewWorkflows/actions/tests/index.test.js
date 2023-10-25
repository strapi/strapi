import {
  addStage,
  cloneStage,
  deleteStage,
  setWorkflow,
  setWorkflows,
  updateStage,
  updateStages,
  updateStagePosition,
  updateWorkflow,
  resetWorkflow,
  setContentTypes,
  setIsLoading,
  setRoles,
} from '..';
import {
  ACTION_SET_WORKFLOW,
  ACTION_DELETE_STAGE,
  ACTION_ADD_STAGE,
  ACTION_CLONE_STAGE,
  ACTION_UPDATE_STAGE,
  ACTION_UPDATE_STAGES,
  ACTION_SET_CONTENT_TYPES,
  ACTION_SET_IS_LOADING,
  ACTION_SET_ROLES,
  ACTION_SET_WORKFLOWS,
  ACTION_UPDATE_STAGE_POSITION,
  ACTION_RESET_WORKFLOW,
  ACTION_UPDATE_WORKFLOW,
} from '../../constants';

describe('Admin | Settings | Review Workflow | actions', () => {
  test('setWorkflow()', () => {
    expect(setWorkflow({ workflow: null, something: 'else' })).toStrictEqual({
      type: ACTION_SET_WORKFLOW,
      payload: null,
    });
  });

  test('setWorkflows()', () => {
    expect(setWorkflows({ workflows: [] })).toStrictEqual({
      type: ACTION_SET_WORKFLOWS,
      payload: [],
    });
  });

  test('deleteStage()', () => {
    expect(deleteStage(1)).toStrictEqual({
      type: ACTION_DELETE_STAGE,
      payload: {
        stageId: 1,
      },
    });
  });

  test('addStage()', () => {
    expect(addStage({ something: '' })).toStrictEqual({
      type: ACTION_ADD_STAGE,
      payload: {
        something: '',
      },
    });

    expect(addStage()).toStrictEqual({
      type: ACTION_ADD_STAGE,
      payload: {},
    });
  });

  test('cloneStage()', () => {
    expect(cloneStage(1)).toStrictEqual({
      type: ACTION_CLONE_STAGE,
      payload: {
        id: 1,
      },
    });
  });

  test('updateStage()', () => {
    expect(updateStage(1, { something: '' })).toStrictEqual({
      type: ACTION_UPDATE_STAGE,
      payload: {
        stageId: 1,
        something: '',
      },
    });
  });

  test('updateStages()', () => {
    expect(updateStages({ something: '' })).toStrictEqual({
      type: ACTION_UPDATE_STAGES,
      payload: {
        something: '',
      },
    });
  });

  test('updateStagePosition()', () => {
    expect(updateStagePosition(1, 2)).toStrictEqual({
      type: ACTION_UPDATE_STAGE_POSITION,
      payload: {
        newIndex: 2,
        oldIndex: 1,
      },
    });
  });

  test('updateWorkflow()', () => {
    expect(updateWorkflow({})).toStrictEqual({
      type: ACTION_UPDATE_WORKFLOW,
      payload: {},
    });
  });

  test('resetWorkflow()', () => {
    expect(resetWorkflow()).toStrictEqual({
      type: ACTION_RESET_WORKFLOW,
    });
  });

  test('setContentTypes()', () => {
    expect(setContentTypes({})).toStrictEqual({
      type: ACTION_SET_CONTENT_TYPES,
      payload: {},
    });
  });

  test('setRoles()', () => {
    expect(setRoles({})).toStrictEqual({
      type: ACTION_SET_ROLES,
      payload: {},
    });
  });

  test('setIsLoading()', () => {
    expect(setIsLoading(true)).toStrictEqual({
      type: ACTION_SET_IS_LOADING,
      payload: true,
    });
  });
});
