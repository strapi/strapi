
import { fromJS } from 'immutable';
import modelPageReducer from '../reducer';

describe('modelPageReducer', () => {
  it('returns the initial state', () => {
    expect(modelPageReducer(undefined, {})).toEqual(fromJS({}));
  });
});
