import expect from 'expect';
import { fromJS } from 'immutable';
import formReducer from '../reducer';

describe('formReducer', () => {
  it('returns the initial state', () => {
    expect(formReducer(undefined, {})).toEqual(fromJS({}));
  });
});
