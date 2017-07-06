import expect from 'expect';
import homeReducer from '../reducer';
import { fromJS } from 'immutable';

describe('homeReducer', () => {
  it('returns the initial state', () => {
    expect(homeReducer(undefined, {})).toEqual(fromJS({}));
  });
});
