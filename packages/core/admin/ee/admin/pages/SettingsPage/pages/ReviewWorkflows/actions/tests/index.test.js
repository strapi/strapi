import { setWorkflows, deleteStage, updateStage, addStage } from '..';

import {
  ACTION_SET_WORKFLOWS,
  ACTION_DELETE_STAGE,
  ACTION_ADD_STAGE,
  ACTION_UPDATE_STAGE,
} from '../../constants';

describe('Admin | Settings | Review Workflow | actions', () => {
  test('setWorkflows()', () => {
    expect(setWorkflows({ status: 'loading', data: null, something: 'else' })).toStrictEqual({
      type: ACTION_SET_WORKFLOWS,
      payload: {
        status: 'loading',
        workflows: null,
      },
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

  test('updateStage()', () => {
    expect(updateStage(1, { something: '' })).toStrictEqual({
      type: ACTION_UPDATE_STAGE,
      payload: {
        stageId: 1,
        something: '',
      },
    });
  });
});
