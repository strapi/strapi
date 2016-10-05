import expect from 'expect';
import notificationProviderReducer from '../reducer';
import { fromJS } from 'immutable';

describe('notificationProviderReducer', () => {
  it('returns the initial state', () => {
    expect(notificationProviderReducer(undefined, {})).toEqual(fromJS({
      notifications: [],
    }));
  });
});
