
import { fromJS } from 'immutable';
import initializerReducer from '../reducer';

describe('initializerReducer', () => {
  it('returns the initial state', () => {
    expect(initializerReducer(undefined, {})).toEqual(fromJS({}));
  });
});
