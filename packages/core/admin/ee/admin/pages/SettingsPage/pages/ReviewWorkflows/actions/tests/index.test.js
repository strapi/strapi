import { setWorkflow } from '..';

import { ACTION_SET_WORKFLOW } from '../../constants';

describe('Admin | Settings | Review Workflow | actions', () => {
  test('setWorkflow()', () => {
    expect(setWorkflow({ status: 'loading', data: null, something: 'else' })).toStrictEqual({
      type: ACTION_SET_WORKFLOW,
      payload: {
        status: 'loading',
        stages: null,
      },
    });
  });
});
