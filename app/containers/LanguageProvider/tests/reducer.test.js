import expect from 'expect';
import languageProviderReducer from '../reducer';
import { fromJS } from 'immutable';

describe('languageProviderReducer', () => {
  it('returns the initial state', () => {
    expect(languageProviderReducer(undefined, {})).toEqual(fromJS({
      locale: 'en',
    }));
  });
});
