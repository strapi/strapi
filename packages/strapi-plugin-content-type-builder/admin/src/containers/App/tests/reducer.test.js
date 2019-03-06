
import { fromJS } from 'immutable';
import appReducer from '../reducer';

describe('appReducer', () => {
  it('returns the initial state', () => {
    expect(appReducer(undefined, {})).toEqual(fromJS({}));
  });
});
