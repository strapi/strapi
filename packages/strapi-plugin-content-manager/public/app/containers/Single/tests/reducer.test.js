import expect from 'expect';
import singleReducer from '../reducer';
import { fromJS } from 'immutable';

describe('singleReducer', () => {
  it('returns the initial state', () => {
    expect(singleReducer(undefined, {})).toEqual(fromJS({}));
  });
});
