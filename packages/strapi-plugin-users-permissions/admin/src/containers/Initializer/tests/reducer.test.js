import { fromJS } from 'immutable';
import { initializeSucceeded } from '../actions';

import initializerReducer from '../reducer';

describe('initializerReducer', () => {
  let state;

  beforeEach(() => {
    state = fromJS({
      hasAdminUser: false,
      shouldUpdate: false,
    });
  });

  it('returns the initial state', () => {
    const expected = state;

    expect(initializerReducer(undefined, {})).toEqual(expected);
  });

  it('should handle the initializeSucceeded action correctly', () => {
    const expected = state.set('hasAdminUser', true).set('shouldUpdate', true);

    expect(initializerReducer(state, initializeSucceeded(true))).toEqual(expected);
  });
});
