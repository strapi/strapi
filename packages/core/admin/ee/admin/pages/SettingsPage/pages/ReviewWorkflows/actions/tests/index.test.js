import { setWorkflows } from '..';

import { ACTION_SET_WORKFLOWS } from '../../constants';

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
});
