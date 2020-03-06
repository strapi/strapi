import { fromJS } from 'immutable';

import { setAppError } from '../actions';
import adminReducer from '../reducer';

describe('adminReducer', () => {
  let state;

  beforeEach(() => {
    state = fromJS({
      appError: false,
      pluginsFromMarketplace: [],
    });
  });

  it('returns the initial state', () => {
    const expected = state;

    expect(adminReducer(undefined, {})).toEqual(expected);
  });

  it('should handle the setaAppError action correctly', () => {
    const expected = state.set('appError', true);

    expect(adminReducer(state, setAppError())).toEqual(expected);
  });
});
