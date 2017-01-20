import expect from 'expect';
import listReducer from '../reducer';
import { fromJS } from 'immutable';

describe('listReducer', () => {
  it('returns the initial state', () => {
    expect(listReducer(undefined, {})).toEqual(fromJS({}));
  });
});
