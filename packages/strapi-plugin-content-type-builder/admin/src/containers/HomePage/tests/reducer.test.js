
import { fromJS } from 'immutable';
import homePageReducer from '../reducer';

describe('homePageReducer', () => {
  it('returns the initial state', () => {
    expect(homePageReducer(undefined, {})).toEqual(fromJS({}));
  });
});
