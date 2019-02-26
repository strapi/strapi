
import { fromJS } from 'immutable';
import onboardingReducer from '../reducer';

describe('onboardingReducer', () => {
  it('returns the initial state', () => {
    expect(onboardingReducer(undefined, [])).toEqual(fromJS([]));
  });
});
